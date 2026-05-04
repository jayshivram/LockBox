import { useEffect, useCallback, useState } from 'react';
import { AlertTriangle, X, LayoutDashboard, Key, Shield, FileText, Settings as SettingsIcon, Fingerprint, RotateCcw, Keyboard } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { VaultList } from './VaultList';
import { PasswordGenerator } from './PasswordGenerator';
import { TOTPManager } from './TOTPManager';
import { SecureNotes } from './SecureNotes';
import { Settings } from './Settings';
import { RecoveryKeyModal } from './RecoveryKeyModal';
import { useVaultStore } from '../store/vaultStore';
import { checkBiometric, isNative, isElectron } from '../utils/capacitor';
import type { View } from '../types';

const WARN_BEFORE_MS = 30_000; // show warning 30 seconds before lock

const SHORTCUTS = [
  { keys: 'Ctrl+F', desc: 'Focus search / go to vault' },
  { keys: 'Ctrl+N', desc: 'Add new entry' },
  { keys: 'Ctrl+L', desc: 'Lock vault' },
  { keys: 'Escape', desc: 'Clear search / close modal' },
  { keys: '?',      desc: 'Show this help' },
];

const BOTTOM_NAV_ITEMS: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Home',     icon: LayoutDashboard },
  { id: 'vault',     label: 'Vault',    icon: Key },
  { id: 'totp',      label: 'Auth',     icon: Shield },
  { id: 'notes',     label: 'Notes',    icon: FileText },
  { id: 'settings',  label: 'Settings', icon: SettingsIcon },
];

function BottomNav() {
  const { currentView, setView } = useVaultStore();
  return (
    <nav className="mobile-bottom-nav md:hidden">
      {BOTTOM_NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = currentView === id;
        return (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
            aria-label={label}
          >
            <Icon size={20} />
            {isActive && <span>{label}</span>}
            {isActive && <span className="mobile-nav-dot" aria-hidden="true" />}
          </button>
        );
      })}
    </nav>
  );
}

export function Layout() {
  const {
    currentView, resetActivity, lock, setSearch, setView,
    recoveryKeyToShow, vaultMeta, lockFiresAt, settings, triggerAddEntry,
    vaultTabUnlocked, setVaultTabUnlocked,
    deletedEntry, undoDeleteEntry, clearDeletedEntry,
  } = useVaultStore();

  const [warnVisible, setWarnVisible] = useState(false);
  const [warnSecsLeft, setWarnSecsLeft] = useState(30);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [vaultGateChecking, setVaultGateChecking] = useState(false);

  // ── Activity → reset auto-lock timer (debounced in store) ────────────────
  const handleActivity = useCallback(() => resetActivity(), [resetActivity]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, handleActivity));
  }, [handleActivity]);

  // ── Auto-lock warning countdown ───────────────────────────────────────────
  useEffect(() => {
    if (settings.autoLockMinutes === 0 || lockFiresAt === 0) {
      setWarnVisible(false);
      return;
    }

    let frameId: number;
    const tick = () => {
      const msLeft = lockFiresAt - Date.now();
      if (msLeft <= WARN_BEFORE_MS && msLeft > 0) {
        setWarnVisible(true);
        setWarnSecsLeft(Math.ceil(msLeft / 1000));
      } else {
        setWarnVisible(false);
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [lockFiresAt, settings.autoLockMinutes]);

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shortcutsOpen) { if (e.key === 'Escape') setShortcutsOpen(false); return; }
      const ctrl = e.ctrlKey || e.metaKey;
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA';
      if (ctrl && e.key === 'f') {
        e.preventDefault();
        setView('vault');
        setTimeout(() => (document.querySelector('input[placeholder*="Search"]') as HTMLInputElement | null)?.focus(), 50);
      }
      if (ctrl && e.key === 'l') { e.preventDefault(); lock(); }
      if (ctrl && e.key === 'n') { e.preventDefault(); triggerAddEntry(); }
      if (e.key === 'Escape') {
        setSearch('');
        (document.activeElement as HTMLElement | null)?.blur();
      }
      if (e.key === '?' && !inInput) { e.preventDefault(); setShortcutsOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lock, setView, setSearch, triggerAddEntry, shortcutsOpen]);

  // ── Vault tab biometric gate ──────────────────────────────────────────────
  const needsVaultGate =
    currentView === 'vault' &&
    !vaultTabUnlocked &&
    (isNative() || isElectron()) &&
    settings.biometricEnabled &&
    settings.requireBiometricForVaultTab;

  useEffect(() => {
    if (!needsVaultGate || vaultGateChecking) return;
    setVaultGateChecking(true);
    checkBiometric({ cancelTitle: 'Cancel' }).then(result => {
      setVaultGateChecking(false);
      if (result.success) {
        setVaultTabUnlocked(true);
      } else {
        // Navigate away if biometric fails/cancelled
        setView('dashboard');
      }
    });
  }, [needsVaultGate, vaultGateChecking, setVaultTabUnlocked, setView]);

  const renderView = () => {
    if (needsVaultGate) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'var(--c-accent-bg)', border: '2px solid var(--c-accent-bd)' }}>
            {vaultGateChecking
              ? <Shield size={36} color="var(--c-accent)" className="animate-pulse" />
              : <Fingerprint size={36} color="var(--c-accent)" />}
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--c-text)' }}>Vault locked</h2>
            <p className="text-sm" style={{ color: 'var(--c-text-m)' }}>
              {vaultGateChecking ? 'Verifying identity…' : 'Biometric required to access the vault'}
            </p>
          </div>
          {!vaultGateChecking && (
            <button
              className="btn-primary px-6 py-3"
              onClick={() => {
                setVaultGateChecking(true);
                checkBiometric({ cancelTitle: 'Cancel' }).then(r => {
                  setVaultGateChecking(false);
                  if (r.success) setVaultTabUnlocked(true);
                  else setView('dashboard');
                });
              }}
            >
              <Fingerprint size={16} /> Try again
            </button>
          )}
        </div>
      );
    }
    switch (currentView) {
      case 'dashboard':  return <Dashboard />;
      case 'vault':      return <VaultList />;
      case 'generator':  return <PasswordGenerator />;
      case 'totp':       return <TOTPManager />;
      case 'notes':      return <SecureNotes />;
      case 'settings':   return <Settings />;
      default:           return <Dashboard />;
    }
  };

  return (
    <div className="h-full flex vault-bg overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col relative">
        {/* Add bottom padding on mobile so content clears the nav bar */}
        <div className="flex-1 overflow-hidden flex flex-col pb-safe-nav md:pb-0">
          {renderView()}
        </div>

        {/* Auto-lock warning toast — above bottom nav on mobile */}
        {warnVisible && (
          <div className="absolute bottom-20 md:bottom-4 right-4 z-50 animate-slide-up flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl"
            style={{ background: 'var(--c-card-solid)', border: '1px solid rgba(245,158,11,0.4)', maxWidth: 340 }}>
            <AlertTriangle size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
                Vault locking in {warnSecsLeft}s
              </p>
              <p className="text-xs" style={{ color: 'var(--c-text-m)' }}>Move the mouse or press a key to stay unlocked</p>
            </div>
            <button onClick={() => resetActivity()}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
              Snooze
            </button>
            <button onClick={() => setWarnVisible(false)} style={{ color: 'var(--c-text-f)' }} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Undo-delete snackbar */}
        {deletedEntry && (
          <div className="absolute bottom-20 md:bottom-4 left-4 z-50 animate-slide-up flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl"
            style={{ background: 'var(--c-card-solid)', border: '1px solid var(--c-border)', maxWidth: 360 }}>
            <span className="text-sm flex-1 truncate" style={{ color: 'var(--c-text)' }}>
              "{deletedEntry.name}" deleted
            </span>
            <button
              onClick={() => undoDeleteEntry()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'var(--c-accent-bgm)', color: 'var(--c-accent)', border: '1px solid var(--c-accent-bd)' }}>
              <RotateCcw size={11} /> Undo
            </button>
            <button onClick={() => clearDeletedEntry()} style={{ color: 'var(--c-text-f)' }} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}
      </main>

      {/* Bottom nav — mobile only */}
      <BottomNav />

      {/* Recovery Key Modal — shown after new setup or v1→v2 migration */}
      {recoveryKeyToShow && (
        <RecoveryKeyModal
          recoveryKey={recoveryKeyToShow}
          isMigration={!!vaultMeta && !recoveryKeyToShow.startsWith('NEW')}
        />
      )}

      {/* Keyboard shortcuts modal */}
      {shortcutsOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShortcutsOpen(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm animate-slide-up"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Keyboard size={18} color="var(--c-accent)" />
                <h2 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>Keyboard Shortcuts</h2>
              </div>
              <button onClick={() => setShortcutsOpen(false)} style={{ color: 'var(--c-text-f)' }} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {SHORTCUTS.map(s => (
                <div key={s.keys} className="flex items-center justify-between py-2 border-b"
                  style={{ borderColor: 'var(--c-border-s)' }}>
                  <span className="text-sm" style={{ color: 'var(--c-text-m)' }}>{s.desc}</span>
                  <kbd className="px-2 py-1 rounded text-xs font-mono"
                    style={{ background: 'var(--c-hover)', color: 'var(--c-text)', border: '1px solid var(--c-border)' }}>
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
