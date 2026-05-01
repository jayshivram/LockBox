import { useState, useEffect } from 'react';
import { Shield, Plus, Copy, Check, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { useVaultStore } from '../store/vaultStore';
import { generateTOTP } from '../utils/totp';
import { copyToClipboard } from '../utils/crypto';

interface TOTPState {
  code: string;
  remaining: number;
  progress: number;
  error?: string;
}

function TOTPCard({ entryId, name, secret }: { entryId: string; name: string; secret: string }) {
  const [state, setState] = useState<TOTPState>({ code: '------', remaining: 30, progress: 100 });
  const [copied, setCopied] = useState(false);
  const { deleteEntry } = useVaultStore();

  useEffect(() => {
    const refresh = async () => {
      const result = await generateTOTP(secret);
      if (result.ok) {
        setState({ code: result.code, remaining: result.remaining, progress: result.progress, error: undefined });
      } else {
        setState(prev => ({ ...prev, error: result.error }));
      }
    };
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, [secret]);

  const handleCopy = () => {
    copyToClipboard(state.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - state.progress / 100);
  const isUrgent = state.remaining <= 5;
  const ringColor = isUrgent ? '#EF4444' : state.remaining <= 10 ? '#F59E0B' : '#22C55E';

  const formattedCode = state.error
    ? '--- ---'
    : state.code !== '------'
      ? `${state.code.slice(0, 3)} ${state.code.slice(3)}`
      : '--- ---';

  return (
    <div className="glass-card rounded-2xl p-5 transition-all"
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--c-accent-bd)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--c-border)')}>
      <div className="flex items-center justify-between gap-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate" style={{ color: 'var(--c-text)' }}>{name}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="font-mono text-2xl font-bold tracking-widest"
              style={{ color: isUrgent ? '#EF4444' : 'var(--c-accent)', letterSpacing: '0.15em' }}>
              {formattedCode}
            </span>
          </div>
          {state.error ? (
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#EF4444' }}>
              <AlertCircle size={11} /> {state.error}
            </p>
          ) : (
            <p className="text-xs mt-1" style={{ color: 'var(--c-text-f)' }}>
              Refreshes in {state.remaining}s
            </p>
          )}
        </div>

        {/* Timer ring */}
        <div className="relative flex-shrink-0 w-12 h-12">
          <svg width="48" height="48" className="totp-ring">
            <circle cx="24" cy="24" r={radius} fill="none" stroke="var(--c-strength-empty)" strokeWidth="3" />
            <circle cx="24" cy="24" r={radius} fill="none" stroke={ringColor} strokeWidth="3"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.5s' }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold"
            style={{ color: ringColor }}>{state.remaining}</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button onClick={handleCopy} className="p-2 rounded-xl transition-all"
            style={{
              background: copied ? 'rgba(34,197,94,0.15)' : 'var(--c-hover)',
              color: copied ? '#22C55E' : 'var(--c-text-s)',
              border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'var(--c-border-s)'}`,
            }} title="Copy code">
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <button onClick={() => { if (confirm(`Delete "${name}"?`)) deleteEntry(entryId); }}
            className="p-2 rounded-xl transition-all"
            style={{ background: 'var(--c-hover)', color: 'var(--c-text-m)', border: '1px solid var(--c-border-s)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--c-text-m)'; e.currentTarget.style.borderColor = 'var(--c-border-s)'; }}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function TOTPManager() {
  const { entries, addEntry } = useVaultStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [testResult, setTestResult] = useState('');
  const [adding, setAdding] = useState(false);

  const totpEntries = entries.filter(e => e.type === 'totp' && e.totpSecret);

  const handleTest = async () => {
    if (!newSecret) return;
    const result = await generateTOTP(newSecret.trim().replace(/\s/g, '').toUpperCase());
    setTestResult(result.ok ? `✓ Valid — current code: ${result.code}` : `✗ ${result.error}`);
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newSecret.trim()) return;
    setAdding(true);
    await addEntry({
      type: 'totp',
      name: newName.trim(),
      totpSecret: newSecret.trim().replace(/\s/g, '').toUpperCase(),
      category: 'Personal',
      tags: [],
      username: '',
      password: '',
      url: '',
      notes: '',
      isFavorite: false,
      isCompromised: false,
    });
    setNewName('');
    setNewSecret('');
    setTestResult('');
    setShowAdd(false);
    setAdding(false);
  };

  return (
    <div className="h-full overflow-y-auto p-6 animate-fade-in">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--c-text)' }}>Authenticator</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--c-text-m)' }}>
              TOTP 2FA codes · refreshes every 30 seconds
            </p>
          </div>
          <button onClick={() => setShowAdd(s => !s)} className="btn-primary">
            <Plus size={15} /> Add Account
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="glass-card rounded-2xl p-6 space-y-4 animate-slide-up">
            <h3 className="font-semibold" style={{ color: 'var(--c-text)' }}>Add TOTP Account</h3>
            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold mb-1.5"
                style={{ color: 'var(--c-text-f)' }}>Account Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                className="input-field" placeholder="e.g. GitHub, Google, AWS..." />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold mb-1.5"
                style={{ color: 'var(--c-text-f)' }}>Secret Key (Base32)</label>
              <input value={newSecret} onChange={e => setNewSecret(e.target.value)}
                className="input-field font-mono text-sm"
                placeholder="JBSWY3DPEHPK3PXP" />
              <p className="text-xs mt-1.5" style={{ color: 'var(--c-text-f)' }}>
                Find this in your account's 2FA / two-factor authentication settings
              </p>
            </div>

            {testResult && (
              <div className="px-3 py-2 rounded-lg text-sm font-mono"
                style={{
                  background: testResult.startsWith('✓') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: testResult.startsWith('✓') ? '#22C55E' : '#EF4444',
                  border: `1px solid ${testResult.startsWith('✓') ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                }}>
                {testResult}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleTest} className="btn-ghost text-sm">
                <RefreshCw size={13} /> Test Secret
              </button>
              <button onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={handleAdd} disabled={!newName || !newSecret || adding} className="btn-primary text-sm ml-auto">
                <Plus size={13} /> {adding ? 'Adding...' : 'Add Account'}
              </button>
            </div>
          </div>
        )}

        {/* TOTP cards */}
        {totpEntries.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Shield size={48} color="var(--c-border)" className="mx-auto mb-4" />
            <p className="font-semibold text-lg" style={{ color: 'var(--c-text-g)' }}>No 2FA accounts yet</p>
            <p className="text-sm mt-2 mb-6" style={{ color: 'var(--c-text-f)' }}>
              Add your TOTP accounts to generate 2FA codes without a phone
            </p>
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus size={15} /> Add First Account
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {totpEntries.map(entry => (
              <TOTPCard
                key={entry.id}
                entryId={entry.id}
                name={entry.name}
                secret={entry.totpSecret!}
              />
            ))}
          </div>
        )}

        {/* Info box */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <AlertCircle size={15} color="#60A5FA" style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{ color: 'var(--c-text-s)' }}>
            TOTP codes are generated locally using RFC 6238. Your secrets never leave this device.
            Back up your vault to avoid losing 2FA access.
          </p>
        </div>
      </div>
    </div>
  );
}
