import { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, Shield, AlertCircle, Loader2, KeyRound, ArrowLeft, HelpCircle, CheckCircle2 } from 'lucide-react';
import { useVaultStore } from '../store/vaultStore';
import { loadEncryptedVault } from '../utils/crypto';

export function UnlockScreen({ biometricVerified = false }: { biometricVerified?: boolean }) {
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPw]   = useState(false);
  const [mode, setMode]             = useState<'password' | 'recovery'>('password');
  const [recoveryInput, setRecovery] = useState('');
  const [hint, setHint]             = useState<string | undefined>(undefined);
  const [supportsRecovery, setSupportsRecovery] = useState(false);
  // Backoff countdown displayed to user
  const [secondsLeft, setSecondsLeft] = useState(0);

  const { unlock, unlockWithRecovery, error, isLoading, clearError, lockoutUntil, failedAttempts } = useVaultStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    // Read hint and vault format from localStorage
    const vault = loadEncryptedVault();
    if (vault?.hint) setHint(vault.hint);
    if (vault?.vaultVersion === 2 && vault.wrappedDEK_rec) setSupportsRecovery(true);
  }, []);

  // Countdown timer for backoff
  useEffect(() => {
    if (lockoutUntil <= Date.now()) { setSecondsLeft(0); return; }
    const tick = () => {
      const left = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left > 0) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [lockoutUntil]);

  const isLockedOut = lockoutUntil > Date.now() && secondsLeft > 0;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isLockedOut) return;
    const ok = await unlock(password);
    if (!ok) { setPassword(''); inputRef.current?.focus(); }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryInput.trim() || isLockedOut) return;
    await unlockWithRecovery(recoveryInput.trim());
  };

  const switchMode = (m: 'password' | 'recovery') => {
    setMode(m); clearError(); setPassword(''); setRecovery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="h-full vault-bg grid-pattern overflow-y-auto relative">
      {/* Centered amber radial — draws the eye to the form */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 35%, var(--c-accent-bgm), transparent)' }} />

      <div className="min-h-full flex flex-col items-center justify-center p-4">

      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5 lock-icon-anim"
            style={{
              background: 'var(--c-accent-bgm)',
              border: '1px solid var(--c-accent-bds)',
              boxShadow: '0 0 0 6px var(--c-accent-bg), 0 8px 32px rgba(240, 180, 41, 0.18)',
            }}>
            <Lock size={36} color="var(--c-accent)" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--c-text)' }}>LockBox</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--c-text-m)' }}>
            {biometricVerified
              ? 'Biometric confirmed. Enter master password to decrypt.'
              : mode === 'recovery' ? 'Enter your recovery key to unlock.' : 'Your vault is locked. Enter master password to continue.'}
          </p>
          {biometricVerified && (
            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)', color: '#22C55E' }}>
              <CheckCircle2 size={12} /> Identity verified · Step 2 of 2
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-7">
          {mode === 'password' ? (
            <form onSubmit={handleUnlock} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--c-text-m)' }}>
                  Master Password
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearError(); }}
                    className="input-field pr-12 font-mono"
                    placeholder="Enter your master password"
                    autoComplete="current-password"
                    disabled={isLockedOut}
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded" style={{ color: 'var(--c-text-m)' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Hint */}
              {hint && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-bd)', color: 'var(--c-accent)' }}>
                  <HelpCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ color: 'var(--c-text-s)' }}><span style={{ color: 'var(--c-accent)' }}>Hint: </span>{hint}</span>
                </div>
              )}

              {/* Error / lockout */}
              {(error || isLockedOut) && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm animate-fade-in"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}>
                  <AlertCircle size={14} />
                  <span className="flex-1">
                    {isLockedOut
                      ? `Too many attempts. Try again in ${secondsLeft}s.`
                      : error}
                  </span>
                  {failedAttempts > 2 && (
                    <span className="text-xs opacity-60">{failedAttempts} attempts</span>
                  )}
                </div>
              )}

              <button type="submit" disabled={isLoading || !password || isLockedOut} className="btn-primary w-full py-3">
                {isLoading
                  ? <><Loader2 size={16} className="animate-spin" /> Unlocking...</>
                  : <><Shield size={16} /> Unlock Vault</>}
              </button>

              {/* Recovery link */}
              {supportsRecovery && (
                <button type="button" onClick={() => switchMode('recovery')}
                  className="w-full text-center text-sm py-2 transition-colors"
                  style={{ color: 'var(--c-text-f)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--c-text-s)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--c-text-f)')}>
                  <KeyRound size={12} className="inline mr-1.5" />
                  Forgot password? Use Recovery Key
                </button>
              )}
            </form>
          ) : (
            /* Recovery key mode */
            <form onSubmit={handleRecovery} className="space-y-5">
              <button type="button" onClick={() => switchMode('password')}
                className="flex items-center gap-2 text-sm mb-2"
                style={{ color: 'var(--c-text-m)' }}>
                <ArrowLeft size={14} /> Back to password login
              </button>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--c-text-m)' }}>
                  Recovery Key
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={recoveryInput}
                  onChange={e => { setRecovery(e.target.value); clearError(); }}
                  className="input-field font-mono text-sm tracking-widest"
                  placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX"
                  disabled={isLockedOut}
                  spellCheck={false}
                  autoCapitalize="characters"
                />
                <p className="text-xs mt-1.5" style={{ color: 'var(--c-text-g)' }}>
                  You'll be taken to Settings to set a new master password after unlocking.
                </p>
              </div>

              {(error || isLockedOut) && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm animate-fade-in"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}>
                  <AlertCircle size={14} />
                  {isLockedOut ? `Too many attempts. Try again in ${secondsLeft}s.` : error}
                </div>
              )}

              <button type="submit" disabled={isLoading || !recoveryInput.trim() || isLockedOut} className="btn-primary w-full py-3">
                {isLoading
                  ? <><Loader2 size={16} className="animate-spin" /> Verifying...</>
                  : <><KeyRound size={16} /> Unlock with Recovery Key</>}
              </button>
            </form>
          )}
        </div>

        {/* Trust bar */}
        <div className="mt-6 flex items-center justify-center gap-4">
          {[
            { label: 'AES-256-GCM', dot: 'var(--c-accent)' },
            { label: 'Zero-knowledge', dot: '#22C55E' },
            { label: 'Local-only', dot: '#60A5FA' },
          ].map(({ label, dot }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--c-text-f)' }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
