import { create } from 'zustand';
import type { VaultEntry, VaultSettings, VaultData, Category, View, EncryptedVault } from '../types';
import {
  generateDEK, deriveKEK, wrapDEK, unwrapDEK,
  deriveKey,   // legacy v1 only
  encryptVault, decryptVault,
  saveEncryptedVault, loadEncryptedVault, vaultExists, deleteVault,
  generateSalt, generateRecoveryKey, normaliseRecoveryKey, bufferToBase64,
  saveLockoutState, loadLockoutState, clearLockoutState,
} from '../utils/crypto';
import { generateId } from '../utils/generator';

// Held outside Zustand so it's never visible in React DevTools or state snapshots.
let _sessionPw = '';

const DEFAULT_SETTINGS: VaultSettings = {
  autoLockMinutes: 15,
  theme: 'dark',
  clipboardClearSeconds: 15,
  requireMasterPasswordOnResume: true,
  biometricEnabled: false,
  wipeAfterAttempts: 0,
};

const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB guard

/** Exponential backoff: attempt n → delay in ms (max 30 s after 5 failures). */
function backoffMs(n: number): number {
  if (n <= 0) return 0;
  return Math.min(1000 * Math.pow(2, n - 1), 30_000);
}

// ─── Vault metadata preserved alongside the DEK in state ─────────────────────
interface VaultMeta {
  vaultVersion: 2;
  wrappedDEK_pw: string;
  wrappedDEK_rec: string;
  saltRec: string;         // base64
  hint?: string;
}

export interface VaultStore {
  // Auth
  isUnlocked: boolean;
  /**
   * Soft-lock: the vault is technically unlocked (DEK still in RAM) but the UI
   * is blocked by the biometric gate. Set when the app goes to the background
   * with biometrics enabled. Cleared on successful biometric re-authentication.
   * On biometric failure/cancel → hard lock (isUnlocked = false, DEK wiped).
   */
  isSoftLocked: boolean;
  isSetup: boolean;
  masterPassword: string;      // cleared when not needed for re-auth
  dek: CryptoKey | null;       // Data Encryption Key in use
  salt: Uint8Array | null;     // password-KEK salt
  vaultMeta: VaultMeta | null; // v2 metadata; null for v1 (migrating)
  error: string | null;
  isLoading: boolean;

  // Recovery / migration
  recoveryKeyToShow: string | null; // non-null → show RecoveryKeyModal
  unlockedViaRecovery: boolean;     // requires new master password

  // Brute-force protection
  failedAttempts: number;
  lockoutUntil: number;  // epoch ms; 0 = no lockout

  // Vault data
  entries: VaultEntry[];
  settings: VaultSettings;

  // UI state
  currentView: View;
  selectedCategory: Category;
  searchQuery: string;
  selectedEntryId: string | null;
  activeFilterType: string;
  sortBy: 'name-asc' | 'name-desc' | 'newest' | 'oldest' | 'strength';

  // Auto-lock
  lockTimer: ReturnType<typeof setTimeout> | null;
  lockFiresAt: number;       // epoch ms; used to drive the warning countdown
  lastActivityReset: number;

  // ── Actions ────────────────────────────────────────────────────────────────
  setup: (password: string, hint?: string) => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  unlockWithRecovery: (recoveryKey: string) => Promise<boolean>;
  lock: () => void;
  /** Engage the soft lock: DEK stays in RAM, UI is blocked by biometric gate. */
  softLock: () => void;
  /** Release the soft lock after successful biometric auth. */
  softUnlock: () => void;
  saveVault: () => Promise<void>;
  addEntry: (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<VaultEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  setView: (view: View) => void;
  setCategory: (cat: Category) => void;
  setSearch: (q: string) => void;
  setSelectedEntry: (id: string | null) => void;
  setActiveFilterType: (f: string) => void;
  setSortBy: (s: VaultStore['sortBy']) => void;
  updateSettings: (s: Partial<VaultSettings>) => Promise<void>;
  resetActivity: () => void;
  exportVault: (includeHistory?: boolean) => string;
  importVault: (data: string) => Promise<void>;
  clearError: () => void;
  acknowledgeRecoveryKey: () => void;
  changeMasterPassword: (oldPw: string, newPw: string) => Promise<void>;
  updateHint: (hint: string) => Promise<void>;
  // Add-entry modal trigger (for Ctrl+N shortcut)
  openAddEntryModal: boolean;
  triggerAddEntry: () => void;
  clearAddEntryModal: () => void;
}

const _initLockout = loadLockoutState();

export const useVaultStore = create<VaultStore>((set, get) => ({
  isUnlocked: false,
  isSoftLocked: false,
  isSetup: vaultExists(),
  masterPassword: '',        // always '' — real password kept in _sessionPw
  dek: null,
  salt: null,
  vaultMeta: null,
  error: null,
  isLoading: false,
  recoveryKeyToShow: null,
  unlockedViaRecovery: false,
  failedAttempts: _initLockout.failedAttempts,
  lockoutUntil: _initLockout.lockoutUntil,
  entries: [],
  settings: DEFAULT_SETTINGS,
  currentView: 'dashboard',
  selectedCategory: 'All',
  searchQuery: '',
  selectedEntryId: null,
  activeFilterType: 'all',
  sortBy: 'name-asc',
  lockTimer: null,
  lockFiresAt: 0,
  lastActivityReset: 0,
  openAddEntryModal: false,

  // ── Setup (always creates a v2 vault) ────────────────────────────────────
  setup: async (password, hint) => {
    // Guard: hint must not reveal the password
    const normHint = hint?.trim().toLowerCase() ?? '';
    const normPw   = password.toLowerCase();
    if (normHint && normHint.includes(normPw)) {
      set({ error: 'Hint cannot contain your password' });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const dek       = await generateDEK();
      const saltPw    = generateSalt();
      const saltRec   = generateSalt();
      const recoveryKey = generateRecoveryKey();

      const kekPw  = await deriveKEK(password, saltPw);
      const kekRec = await deriveKEK(normaliseRecoveryKey(recoveryKey), saltRec);
      const wrappedDEK_pw  = await wrapDEK(dek, kekPw);
      const wrappedDEK_rec = await wrapDEK(dek, kekRec);

      const initialData: VaultData = { entries: [], settings: DEFAULT_SETTINGS, version: '1.0.0' };
      const encrypted = await encryptVault(initialData, dek, saltPw);
      const v2Vault: EncryptedVault = {
        ...encrypted,
        vaultVersion: 2,
        wrappedDEK_pw,
        wrappedDEK_rec,
        saltRec: bufferToBase64(saltRec.buffer),
        hint: hint?.trim() || undefined,
      };
      saveEncryptedVault(v2Vault);

      _sessionPw = password;
      const meta: VaultMeta = { vaultVersion: 2, wrappedDEK_pw, wrappedDEK_rec, saltRec: bufferToBase64(saltRec.buffer), hint: hint?.trim() };
      set({
        isUnlocked: true, isSetup: true,
        masterPassword: '',
        dek, salt: saltPw, vaultMeta: meta,
        entries: [], settings: DEFAULT_SETTINGS,
        isLoading: false,
        recoveryKeyToShow: recoveryKey,
        failedAttempts: 0, lockoutUntil: 0,
      });
      clearLockoutState();
      get().resetActivity();
    } catch {
      set({ error: 'Failed to create vault', isLoading: false });
    }
  },

  // ── Unlock with master password ───────────────────────────────────────────
  unlock: async (password) => {
    const { lockoutUntil, failedAttempts } = get();
    const now = Date.now();
    if (lockoutUntil > now) {
      const secs = Math.ceil((lockoutUntil - now) / 1000);
      set({ error: `Too many attempts. Try again in ${secs}s.` });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const encrypted = loadEncryptedVault();
      if (!encrypted) { set({ error: 'No vault found', isLoading: false }); return false; }

      const saltPw = Uint8Array.from(atob(encrypted.salt), c => c.charCodeAt(0));
      let dek: CryptoKey;
      let data: VaultData;
      let isV1 = false;

      if (encrypted.vaultVersion === 2) {
        const kek = await deriveKEK(password, saltPw);
        dek  = await unwrapDEK(encrypted.wrappedDEK_pw!, kek); // throws on wrong password
        data = await decryptVault(encrypted, dek);
      } else {
        // v1 path — will immediately migrate below
        const legacyKey = await deriveKey(password, saltPw); // throws on wrong password
        data = await decryptVault(encrypted, legacyKey);
        dek  = await generateDEK(); // fresh extractable DEK for v2
        isV1 = true;
      }

      const meta: VaultMeta | null = encrypted.vaultVersion === 2
        ? { vaultVersion: 2, wrappedDEK_pw: encrypted.wrappedDEK_pw!, wrappedDEK_rec: encrypted.wrappedDEK_rec!, saltRec: encrypted.saltRec!, hint: encrypted.hint }
        : null;

      _sessionPw = password;
      set({
        isUnlocked: true,
        masterPassword: '',
        dek, salt: saltPw, vaultMeta: meta,
        entries: data.entries || [],
        settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
        isLoading: false,
        currentView: 'dashboard',
        failedAttempts: 0, lockoutUntil: 0,
        unlockedViaRecovery: false,
      });
      clearLockoutState();
      get().resetActivity();

      // Migrate v1 → v2 in the background (non-blocking)
      if (isV1) {
        setTimeout(async () => {
          try {
            const { entries, settings } = get();
            const saltRec    = generateSalt();
            const recoveryKey = generateRecoveryKey();
            const kekPw  = await deriveKEK(password, saltPw);
            const kekRec = await deriveKEK(normaliseRecoveryKey(recoveryKey), saltRec);
            const wrappedDEK_pw  = await wrapDEK(dek, kekPw);
            const wrappedDEK_rec = await wrapDEK(dek, kekRec);
            const vaultData: VaultData = { entries, settings, version: '1.0.0' };
            const newEncrypted = await encryptVault(vaultData, dek, saltPw);
            const saltRecB64 = bufferToBase64(saltRec.buffer);
            saveEncryptedVault({
              ...newEncrypted,
              vaultVersion: 2,
              wrappedDEK_pw, wrappedDEK_rec,
              saltRec: saltRecB64,
              hint: encrypted.hint,
            });
            const newMeta: VaultMeta = { vaultVersion: 2, wrappedDEK_pw, wrappedDEK_rec, saltRec: saltRecB64 };
            set({ vaultMeta: newMeta, recoveryKeyToShow: recoveryKey });
          } catch { /* migration failed silently; vault is still accessible */ }
        }, 200);
      }

      return true;
    } catch {
      const newAttempts = failedAttempts + 1;
      const delay = backoffMs(newAttempts);
      const lockoutUntil = delay > 0 ? Date.now() + delay : 0;
      saveLockoutState(newAttempts, lockoutUntil);
      set({
        error: 'Incorrect master password',
        isLoading: false,
        failedAttempts: newAttempts,
        lockoutUntil,
      });
      // Wipe vault if the attempt threshold is reached
      const { wipeAfterAttempts } = get().settings;
      if (wipeAfterAttempts > 0 && newAttempts >= wipeAfterAttempts) {
        deleteVault();
        clearLockoutState();
        window.location.reload();
      }
      return false;
    }
  },

  // ── Unlock with Recovery Key ──────────────────────────────────────────────
  unlockWithRecovery: async (recoveryKey) => {
    const { lockoutUntil, failedAttempts } = get();
    const now = Date.now();
    if (lockoutUntil > now) {
      const secs = Math.ceil((lockoutUntil - now) / 1000);
      set({ error: `Too many attempts. Try again in ${secs}s.` });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const encrypted = loadEncryptedVault();
      if (!encrypted || encrypted.vaultVersion !== 2 || !encrypted.wrappedDEK_rec || !encrypted.saltRec) {
        set({ error: 'Recovery key not available. Vault must be v2 format.', isLoading: false });
        return false;
      }

      const saltRec = Uint8Array.from(atob(encrypted.saltRec), c => c.charCodeAt(0));
      const kekRec  = await deriveKEK(normaliseRecoveryKey(recoveryKey), saltRec);
      const dek     = await unwrapDEK(encrypted.wrappedDEK_rec, kekRec); // throws on wrong key
      const saltPw  = Uint8Array.from(atob(encrypted.salt), c => c.charCodeAt(0));
      const data    = await decryptVault(encrypted, dek);

      const meta: VaultMeta = {
        vaultVersion: 2,
        wrappedDEK_pw: encrypted.wrappedDEK_pw!,
        wrappedDEK_rec: encrypted.wrappedDEK_rec,
        saltRec: encrypted.saltRec,
        hint: encrypted.hint,
      };

      set({
        isUnlocked: true,
        masterPassword: '',   // force user to set a new password
        dek, salt: saltPw, vaultMeta: meta,
        entries: data.entries || [],
        settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
        isLoading: false,
        currentView: 'settings', // direct them to change their password
        failedAttempts: 0, lockoutUntil: 0,
        unlockedViaRecovery: true,
      });
      clearLockoutState();
      get().resetActivity();
      return true;
    } catch {
      const newAttempts = failedAttempts + 1;
      const delay = backoffMs(newAttempts);
      const lockoutUntil = delay > 0 ? Date.now() + delay : 0;
      saveLockoutState(newAttempts, lockoutUntil);
      set({
        error: 'Invalid recovery key',
        isLoading: false,
        failedAttempts: newAttempts,
        lockoutUntil,
      });
      // Wipe vault if the attempt threshold is reached
      const { wipeAfterAttempts } = get().settings;
      if (wipeAfterAttempts > 0 && newAttempts >= wipeAfterAttempts) {
        deleteVault();
        clearLockoutState();
        window.location.reload();
      }
      return false;
    }
  },

  // ── Lock (Hard Lock — wipes DEK from memory) ──────────────────────────────
  lock: () => {
    _sessionPw = '';
    const { lockTimer } = get();
    if (lockTimer) clearTimeout(lockTimer);
    set({
      isUnlocked: false,
      isSoftLocked: false,
      masterPassword: '',
      dek: null,
      salt: null,
      vaultMeta: null,
      entries: [],
      lockTimer: null,
      lockFiresAt: 0,
      selectedEntryId: null,
      searchQuery: '',
      activeFilterType: 'all',
      isSetup: vaultExists(),
      unlockedViaRecovery: false,
    });
  },

  // ── Soft Lock (DEK stays in RAM, UI blocked by biometric gate) ────────────
  softLock: () => {
    // Pause the auto-lock timer while the gate is showing, to avoid a
    // double-lock scenario during the biometric prompt flow.
    const { lockTimer } = get();
    if (lockTimer) clearTimeout(lockTimer);
    set({ isSoftLocked: true, lockTimer: null });
  },

  // ── Soft Unlock (biometric passed — resume session) ───────────────────────
  softUnlock: () => {
    set({ isSoftLocked: false });
    // Restart the inactivity timer now that the user is back.
    get().resetActivity();
  },

  // ── Save ─────────────────────────────────────────────────────────────────
  saveVault: async () => {
    const { entries, settings, dek, salt, vaultMeta } = get();
    if (!dek || !salt) return;
    const data: VaultData = { entries, settings, version: '1.0.0' };
    const encrypted = await encryptVault(data, dek, salt);
    if (vaultMeta) {
      saveEncryptedVault({
        ...encrypted,
        vaultVersion: 2,
        wrappedDEK_pw: vaultMeta.wrappedDEK_pw,
        wrappedDEK_rec: vaultMeta.wrappedDEK_rec,
        saltRec: vaultMeta.saltRec,
        hint: vaultMeta.hint,
      });
    } else {
      saveEncryptedVault(encrypted); // v1 (should only happen briefly during migration)
    }
  },

  // ── CRUD ─────────────────────────────────────────────────────────────────
  addEntry: async (entryData) => {
    const now = new Date().toISOString();
    const entry: VaultEntry = { ...entryData, id: generateId(), createdAt: now, updatedAt: now, passwordHistory: [] };
    set(s => ({ entries: [...s.entries, entry] }));
    await get().saveVault();
  },

  updateEntry: async (id, updates) => {
    set(s => ({
      entries: s.entries.map(e => {
        if (e.id !== id) return e;
        const oldPw = e.password;
        const newPw = updates.password;
        let passwordHistory = e.passwordHistory || [];
        if (newPw && oldPw && newPw !== oldPw) {
          passwordHistory = [{ password: oldPw, changedAt: new Date().toISOString() }, ...passwordHistory.slice(0, 9)];
        }
        return { ...e, ...updates, passwordHistory, updatedAt: new Date().toISOString() };
      }),
    }));
    await get().saveVault();
  },

  deleteEntry: async (id) => {
    set(s => ({ entries: s.entries.filter(e => e.id !== id), selectedEntryId: null }));
    await get().saveVault();
  },

  // ── UI setters ────────────────────────────────────────────────────────────
  setView: (view) => set({ currentView: view, selectedEntryId: null }),
  setCategory: (cat) => set({ selectedCategory: cat }),
  setSearch: (q) => set({ searchQuery: q }),
  setSelectedEntry: (id) => set({ selectedEntryId: id }),
  setActiveFilterType: (f) => set({ activeFilterType: f }),
  setSortBy: (s) => set({ sortBy: s }),

  // ── Settings ──────────────────────────────────────────────────────────────
  updateSettings: async (s) => {
    set(st => ({ settings: { ...st.settings, ...s } }));
    await get().saveVault();
    get().resetActivity(); // restart lock timer with new duration
  },

  // ── Auto-lock timer (debounced to ≤1 reset per 10 s) ─────────────────────
  resetActivity: () => {
    const now = Date.now();
    const { lastActivityReset, lockTimer, settings } = get();
    if (now - lastActivityReset < 10_000 && lockTimer !== null) return;
    if (lockTimer) clearTimeout(lockTimer);
    if (settings.autoLockMinutes > 0) {
      const fireAt = now + settings.autoLockMinutes * 60_000;
      const timer  = setTimeout(() => get().lock(), settings.autoLockMinutes * 60_000);
      set({ lockTimer: timer, lockFiresAt: fireAt, lastActivityReset: now });
    } else {
      set({ lockTimer: null, lockFiresAt: 0, lastActivityReset: now });
    }
  },

  // ── Export (password history stripped by default) ─────────────────────────
  exportVault: (includeHistory = false) => {
    const { entries } = get();
    const out = includeHistory ? entries : entries.map(e => ({ ...e, passwordHistory: [] }));
    return JSON.stringify({ entries: out, exportedAt: new Date().toISOString(), version: '1.0.0' }, null, 2);
  },

  // ── Import (sanitised, size-limited) ─────────────────────────────────────
  importVault: async (data) => {
    if (data.length > MAX_IMPORT_BYTES) throw new Error('File too large (max 5 MB)');
    const parsed = JSON.parse(data);
    const VALID_TYPES = new Set(['login', 'note', 'totp', 'apikey', 'wifi', 'bank', 'identity']);
    const VALID_CATS  = new Set(['All', 'Personal', 'Work', 'Finance', 'Crypto', 'Social', 'Servers', 'API Keys', 'Network']);
    const now = new Date().toISOString();
    const raw: unknown[] = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.entries) ? parsed.entries : []);

    const sanitised: VaultEntry[] = raw.map((r: unknown) => {
      const e = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
      const str    = (v: unknown, fb = '', max = 10_000): string => typeof v === 'string' ? v.slice(0, max) : fb;
      const bool   = (v: unknown, fb = false): boolean => typeof v === 'boolean' ? v : fb;
      const strArr = (v: unknown): string[] => Array.isArray(v)
        ? (v as unknown[]).filter(x => typeof x === 'string').slice(0, 20).map(x => (x as string).slice(0, 100)) as string[]
        : [];
      const hist = (v: unknown) => Array.isArray(v)
        ? (v as unknown[]).filter(h => h && typeof h === 'object').slice(0, 10)
            .map(h => { const hh = h as Record<string, unknown>; return { password: str(hh['password'], '', 1000), changedAt: str(hh['changedAt'], now, 100) }; })
            .filter(h => h.password.length > 0)
        : [];
      return {
        id: generateId(),
        type:           VALID_TYPES.has(str(e['type'])) ? (str(e['type']) as VaultEntry['type']) : 'login',
        name:           str(e['name'], 'Imported Entry', 500),
        username:       str(e['username'], '', 500),
        password:       str(e['password'], '', 1000),
        url:            str(e['url'], '', 2048),
        notes:          str(e['notes'], '', 10_000),
        category:       VALID_CATS.has(str(e['category'])) ? (str(e['category']) as VaultEntry['category']) : 'Personal',
        tags:           strArr(e['tags']),
        apiKey:         str(e['apiKey'], '', 2000),
        apiKeyName:     str(e['apiKeyName'], '', 500),
        totpSecret:     str(e['totpSecret'], '', 256),
        wifiSsid:       str(e['wifiSsid'], '', 256),
        adminPassword:  str(e['adminPassword'], '', 1000),
        // Bank fields
        bankName:       str(e['bankName'], '', 500),
        accountType:    str(e['accountType'], '', 100),
        accountNumber:  str(e['accountNumber'], '', 50),
        routingNumber:  str(e['routingNumber'], '', 50),
        iban:           str(e['iban'], '', 50),
        swiftBic:       str(e['swiftBic'], '', 20),
        cardNumber:     str(e['cardNumber'], '', 19),
        cardExpiry:     str(e['cardExpiry'], '', 10),
        cardCvv:        str(e['cardCvv'], '', 4),
        cardholderName: str(e['cardholderName'], '', 200),
        cardPin:        str(e['cardPin'], '', 8),
        // Identity fields
        idType:          str(e['idType'], '', 100),
        idNumber:        str(e['idNumber'], '', 50),
        fullName:        str(e['fullName'], '', 300),
        dateOfBirth:     str(e['dateOfBirth'], '', 20),
        nationality:     str(e['nationality'], '', 100),
        issuingCountry:  str(e['issuingCountry'], '', 100),
        issuingAuthority:str(e['issuingAuthority'], '', 200),
        issueDate:       str(e['issueDate'], '', 20),
        expiryDate:      str(e['expiryDate'], '', 20),
        address:         str(e['address'], '', 1000),
        isFavorite:     bool(e['isFavorite']),
        isCompromised:  bool(e['isCompromised']),
        passwordHistory: hist(e['passwordHistory']),
        createdAt:      str(e['createdAt'], now),
        updatedAt:      now,
      } satisfies VaultEntry;
    });

    set(s => ({ entries: [...s.entries, ...sanitised] }));
    await get().saveVault();
  },

  clearError: () => set({ error: null }),
  acknowledgeRecoveryKey: () => set({ recoveryKeyToShow: null }),

  // ── Change Master Password ────────────────────────────────────────────────
  changeMasterPassword: async (oldPw, newPw) => {
    set({ isLoading: true, error: null });
    try {
      const { dek, salt, vaultMeta, unlockedViaRecovery } = get();
      if (!dek || !salt || !vaultMeta) throw new Error('Vault not unlocked or not v2');

      if (!unlockedViaRecovery) {
        // Verify old password: re-derive KEK and attempt unwrap
        const kekOld = await deriveKEK(oldPw, salt);
        await unwrapDEK(vaultMeta.wrappedDEK_pw, kekOld); // throws if wrong
      }

      const kekNew = await deriveKEK(newPw, salt);
      const wrappedDEK_pw = await wrapDEK(dek, kekNew);
      const newMeta = { ...vaultMeta, wrappedDEK_pw };
      _sessionPw = newPw; // keep session password in sync (never store in observable state)
      set({ vaultMeta: newMeta, unlockedViaRecovery: false });
      await get().saveVault();
      set({ isLoading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to change password', isLoading: false });
    }
  },

  // ── Update Hint ───────────────────────────────────────────────────────────
  updateHint: async (hint) => {
    const { vaultMeta } = get();
    if (!vaultMeta) return;
    // Guard: hint must not reveal the password
    if (_sessionPw && hint.trim().toLowerCase().includes(_sessionPw.toLowerCase())) {
      set({ error: 'Hint cannot contain your password' });
      return;
    }
    const newMeta = { ...vaultMeta, hint: hint.trim() || undefined };
    set({ vaultMeta: newMeta });
    await get().saveVault();
  },

  triggerAddEntry: () => set({ currentView: 'vault', openAddEntryModal: true }),
  clearAddEntryModal: () => set({ openAddEntryModal: false }),
}));

