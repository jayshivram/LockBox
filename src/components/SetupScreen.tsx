import { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2, CheckCircle2, HelpCircle } from 'lucide-react';
import { useVaultStore } from '../store/vaultStore';
import { checkStrength } from '../utils/strength';

export function SetupScreen() {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [hint, setHint]           = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [showCfm, setShowCfm]     = useState(false);
  const { setup, isLoading, error } = useVaultStore();

  const strength = checkStrength(password);
  const passwordsMatch = password && confirm && password === confirm;
  const canSubmit = password.length >= 8 && strength.score >= 1 && passwordsMatch && !isLoading;

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await setup(password, hint || undefined);
  };

  const requirements = [
    { met: password.length >= 8,         text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password),        text: 'One uppercase letter' },
    { met: /[0-9]/.test(password),        text: 'One number' },
    { met: /[^a-zA-Z0-9]/.test(password), text: 'One special character' },
    { met: !!passwordsMatch,              text: 'Passwords match' },
  ];

  return (
    <div className="h-full vault-bg grid-pattern flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/3 right-1/3 w-80 h-80 rounded-full opacity-5"
        style={{ background: 'radial-gradient(circle, #F0B429, transparent)' }} />

      <div className="w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, var(--c-card-solid) 0%, var(--c-card-solid) 100%)', border: '1px solid var(--c-accent-bd)' }}>
            <Lock size={28} color="#F0B429" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--c-accent)' }}>Welcome to LockBox</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--c-text-m)' }}>
            Create your master password to encrypt your vault.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <form onSubmit={handleSetup} className="space-y-5">
            {/* Master password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--c-text-m)' }}>
                Master Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-12 font-mono"
                  placeholder="Create a strong master password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: 'var(--c-text-m)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {password && (
                <div className="mt-3 animate-fade-in">
                  <div className="flex gap-1 mb-1.5">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} className="strength-bar flex-1"
                        style={{ background: i <= strength.score ? strength.color : 'var(--c-strength-empty)' }} />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: strength.color }}>{strength.label}</span>
                    <span style={{ color: 'var(--c-text-m)' }}>{strength.entropy} bits entropy</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--c-text-m)' }}>
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showCfm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="input-field pr-12 font-mono"
                  placeholder="Re-enter your master password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowCfm(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: 'var(--c-text-m)' }}>
                  {showCfm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Password hint (optional) */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--c-text-m)' }}>
                <HelpCircle size={12} />
                Password Hint <span style={{ color: 'var(--c-text-g)' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={hint}
                onChange={e => setHint(e.target.value)}
                className="input-field text-sm"
                placeholder="A reminder — never the password itself"
                maxLength={120}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--c-text-g)' }}>
                This hint is stored unencrypted and shown on the lock screen. Do not put your actual password here.
              </p>
            </div>

            {/* Requirements checklist */}
            {password && (
              <div className="grid grid-cols-2 gap-1.5 animate-fade-in">
                {requirements.map((req, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 size={13} color={req.met ? '#22C55E' : 'var(--c-text-g)'} />
                    <span style={{ color: req.met ? 'var(--c-text-s)' : 'var(--c-text-f)' }}>{req.text}</span>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button type="submit" disabled={!canSubmit} className="btn-primary w-full py-3 mt-2">
              {isLoading
                ? <><Loader2 size={16} className="animate-spin" /> Creating encrypted vault...</>
                : <><ShieldCheck size={16} /> Create My Vault</>}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--c-text-g)' }}>
          AES-256-GCM · PBKDF2 key derivation · DEK wrapping · Recovery key · Zero knowledge
        </p>
      </div>
    </div>
  );
}
