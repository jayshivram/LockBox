import type { EncryptedVault, VaultData } from '../types';

const ITERATIONS = 310_000;
const VAULT_KEY   = 'lockbox_vault';
const SALT_KEY    = 'lockbox_salt';  // kept for deleteVault cleanup
const LOCKOUT_KEY = 'lockbox_lockout';

// ─── Encoding helpers ─────────────────────────────────────────────────────────

export function bufferToBase64(buffer: ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function generateSalt(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(32)));
}

// ─── v2: DEK-Wrapping Architecture ───────────────────────────────────────────
//
// The vault is encrypted with a random AES-GCM Data Encryption Key (DEK).
// That DEK is then "wrapped" (encrypted) by two separate Key Encryption Keys
// (KEKs) — one derived from the master password and one from the recovery key.
// Either KEK can be used to unlock (unwrap) the DEK, then decrypt the vault.

/** Generate a fresh, *extractable* 256-bit AES-GCM DEK (required for AES-KW wrapping). */
export async function generateDEK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,                  // extractable so it can be wrapped
    ['encrypt', 'decrypt']
  );
}

/** Derive a Key Encryption Key (AES-KW) from a password/passphrase via PBKDF2. */
export async function deriveKEK(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new Uint8Array(salt), iterations: ITERATIONS, hash: 'SHA-256' },
    km,
    { name: 'AES-KW', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  );
}

/** Wrap (encrypt) a DEK with a KEK using AES-KW. Returns base64-encoded result. */
export async function wrapDEK(dek: CryptoKey, kek: CryptoKey): Promise<string> {
  const wrapped = await crypto.subtle.wrapKey('raw', dek, kek, 'AES-KW');
  return bufferToBase64(wrapped);
}

/** Unwrap (decrypt) a base64-encoded wrapped DEK using a KEK. Throws on wrong key. */
export async function unwrapDEK(wrappedB64: string, kek: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    base64ToBuffer(wrappedB64),
    kek,
    'AES-KW',
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a human-readable Recovery Key.
 * 18 random bytes → 36 uppercase hex chars → 6 groups of 6: XXXXXX-XXXXXX-…
 * Provides 144 bits of entropy — stronger than most master passwords.
 */
export function generateRecoveryKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return (hex.match(/.{6}/g) as string[]).join('-');
}

/**
 * Strip dashes and normalise a recovery key before use in key derivation.
 * This lets users type with or without dashes / spaces.
 */
export function normaliseRecoveryKey(key: string): string {
  return key.replace(/[\s-]/g, '').toUpperCase();
}

// ─── v1 Legacy (kept ONLY for migrating old vaults) ──────────────────────────

/** @deprecated Use DEK architecture for all new vaults. */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new Uint8Array(salt), iterations: ITERATIONS, hash: 'SHA-256' },
    km,
    { name: 'AES-GCM', length: 256 },
    false,          // non-extractable — only used to decrypt, never wrapped
    ['encrypt', 'decrypt']
  );
}

// ─── Vault Encrypt / Decrypt (works with any valid AES-GCM CryptoKey) ────────

export async function encryptVault(
  data: VaultData,
  key: CryptoKey,
  salt: Uint8Array
): Promise<EncryptedVault> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(data))
  );
  return {
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(ciphertext),
    version: '1.0.0',
    createdAt: new Date().toISOString(),
  };
}

export async function decryptVault(encrypted: EncryptedVault, key: CryptoKey): Promise<VaultData> {
  const iv         = new Uint8Array(base64ToBuffer(encrypted.iv));
  const ciphertext = base64ToBuffer(encrypted.ciphertext);
  const plaintext  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

// ─── localStorage persistence ─────────────────────────────────────────────────

export function saveEncryptedVault(vault: EncryptedVault): void {
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
}

export function loadEncryptedVault(): EncryptedVault | null {
  const raw = localStorage.getItem(VAULT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    // Reject any version we don't know how to handle
    if (parsed.vaultVersion !== undefined && parsed.vaultVersion !== 2) {
      throw new Error(`Unsupported vault version: ${parsed.vaultVersion}`);
    }
    return parsed as EncryptedVault;
  } catch { return null; }
}

// ─── Brute-force lockout persistence ─────────────────────────────────────────

export function saveLockoutState(failedAttempts: number, lockoutUntil: number): void {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ failedAttempts, lockoutUntil }));
}

export function loadLockoutState(): { failedAttempts: number; lockoutUntil: number } {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { failedAttempts: 0, lockoutUntil: 0 };
    const p = JSON.parse(raw);
    return {
      failedAttempts: typeof p.failedAttempts === 'number' ? p.failedAttempts : 0,
      lockoutUntil:   typeof p.lockoutUntil   === 'number' ? p.lockoutUntil   : 0,
    };
  } catch { return { failedAttempts: 0, lockoutUntil: 0 }; }
}

export function clearLockoutState(): void {
  localStorage.removeItem(LOCKOUT_KEY);
}

export function deleteVault(): void {
  localStorage.removeItem(VAULT_KEY);
  localStorage.removeItem(SALT_KEY);
}

export function vaultExists(): boolean {
  return localStorage.getItem(VAULT_KEY) !== null;
}

// ─── Encrypted Export ─────────────────────────────────────────────────────────

export async function encryptExport(data: string, passphrase: string): Promise<string> {
  const enc  = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const km   = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const key  = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' },
    km,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt']
  );
  const iv         = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(data));
  return JSON.stringify({
    format: 'lockbox-encrypted-export-v1',
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(ciphertext),
  });
}

export async function decryptImport(encryptedJson: string, passphrase: string): Promise<string> {
  const parsed = JSON.parse(encryptedJson);
  if (parsed?.format !== 'lockbox-encrypted-export-v1') throw new Error('Unknown export format');
  const enc = new TextEncoder();
  const salt = new Uint8Array(base64ToBuffer(parsed.salt));
  const km   = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const key  = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' },
    km,
    { name: 'AES-GCM', length: 256 },
    false, ['decrypt']
  );
  const iv         = new Uint8Array(base64ToBuffer(parsed.iv));
  const ciphertext = base64ToBuffer(parsed.ciphertext);
  const plaintext  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

// ─── Clipboard ────────────────────────────────────────────────────────────────

let clipboardTimer: ReturnType<typeof setTimeout> | null = null;

export function copyToClipboard(text: string, clearAfterMs = 15_000): void {
  navigator.clipboard.writeText(text).catch(() => {
    // Fallback for environments without clipboard API
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  });
  if (clipboardTimer) clearTimeout(clipboardTimer);
  if (clearAfterMs > 0) {
    clipboardTimer = setTimeout(
      () => navigator.clipboard.writeText('').catch(() => {}),
      clearAfterMs
    );
  }
}

// ─── HIBP Breach Check (k-anonymity model) ────────────────────────────────────

export async function checkPasswordBreach(password: string): Promise<number> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-1', enc.encode(password));
  const hashHex    = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const prefix = hashHex.slice(0, 5);
  const suffix = hashHex.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' }, // prevents traffic-analysis attacks
    });
    if (!res.ok) return -1;
    for (const line of (await res.text()).split('\n')) {
      const [hash, count] = line.split(':');
      if (hash.trim() === suffix) return parseInt(count.trim(), 10);
    }
    return 0;
  } catch {
    return -1; // network error
  }
}
