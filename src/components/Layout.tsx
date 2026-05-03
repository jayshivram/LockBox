import { useEffect, useCallback, useState } from 'react';
import { AlertTriangle, X, LayoutDashboard, Key, Shield, FileText, Settings as SettingsIcon } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { VaultList } from './VaultList';
import { PasswordGenerator } from './PasswordGenerator';
import { TOTPManager } from './TOTPManager';
import { SecureNotes } from './SecureNotes';
import { Settings } from './Settings';
import { RecoveryKeyModal } from './RecoveryKeyModal';
import { useVaultStore } from '../store/vaultStore';
import type { View } from '../types';

const WARN_BEFORE_MS = 30_000; // show warning 30 seconds before lock

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
  } = useVaultStore();

  const [warnVisible, setWarnVisible] = useState(false);
  const [warnSecsLeft, setWarnSecsLeft] = useState(30);

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
      const ctrl = e.ctrlKey || e.metaKey;
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
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lock, setView, setSearch, triggerAddEntry]);

  const renderView = () => {
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
            <button onClick={() => setWarnVisible(false)} style={{ color: 'var(--c-text-f)' }}>
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
    </div>
  );
}
