import { useState } from 'react';
import { ShieldCheck, Copy, Check, AlertTriangle, Printer, KeyRound } from 'lucide-react';
import { useVaultStore } from '../store/vaultStore';
import { copyToClipboard } from '../utils/crypto';

interface Props {
  recoveryKey: string;
  isMigration?: boolean; // true = upgrading old vault, false = brand new setup
}

export function RecoveryKeyModal({ recoveryKey, isMigration }: Props) {
  const { acknowledgeRecoveryKey } = useVaultStore();
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopy = () => {
    copyToClipboard(recoveryKey, 0); // user explicitly copies — don't auto-clear
    setCopied(true);
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>LockBox Recovery Key</title><style>
        body { font-family: monospace; padding: 2rem; }
        .key { font-size: 1.5rem; font-weight: bold; letter-spacing: 0.15em; margin: 1.5rem 0; color: #1a1a2e; }
        .warn { color: #c0392b; font-size: 0.9rem; }
      </style></head><body>
        <h1>🔒 LockBox Recovery Key</h1>
        <p>Keep this in a safe, offline location. Do not store it digitally with your passwords.</p>
        <div class="key">${recoveryKey}</div>
        <p class="warn">⚠ If this key is lost and you forget your master password, your vault cannot be recovered.</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
      </body></html>
    `);
    w.print();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-lg glass-card rounded-2xl animate-slide-up overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-5 text-center"
          style={{ borderBottom: '1px solid var(--c-accent-bd)' }}>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'var(--c-accent-bgm)', border: '1px solid var(--c-accent-bds)' }}>
            <KeyRound size={26} color="#F0B429" />
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--c-accent)' }}>
            {isMigration ? 'Your Vault Has Been Upgraded' : 'Save Your Recovery Key'}
          </h2>
          <p className="text-sm" style={{ color: 'var(--c-text-s)' }}>
            {isMigration
              ? 'Your vault is now protected with a Recovery Key. Save it before continuing.'
              : 'This is the only way to access your vault if you forget your master password.'}
          </p>
        </div>

        <div className="px-8 py-6 space-y-5">
          {/* The recovery key display */}
          <div className="rounded-xl p-5 text-center"
            style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-accent-bd)' }}>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--c-text-f)' }}>
              Recovery Key
            </p>
            <p className="font-mono text-xl font-bold tracking-[0.2em] select-all"
              style={{ color: 'var(--c-accent)', letterSpacing: '0.18em' }}>
              {recoveryKey}
            </p>
            <p className="text-xs mt-3" style={{ color: 'var(--c-text-g)' }}>
              6 groups × 6 characters · 144-bit entropy
            </p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleCopy}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: copied ? 'rgba(34,197,94,0.15)' : 'var(--c-hover)', color: copied ? '#22C55E' : 'var(--c-text-s)', border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'var(--c-border-s)'}` }}>
              {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
            </button>
            <button onClick={handlePrint}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--c-hover)', color: 'var(--c-text-s)', border: '1px solid var(--c-border-s)' }}>
              <Printer size={14} /> Print
            </button>
          </div>

          {/* Warning box */}
          <div className="flex items-start gap-3 p-3 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={14} color="#EF4444" style={{ marginTop: 2, flexShrink: 0 }} />
            <p className="text-xs" style={{ color: '#F87171' }}>
              <strong>Never store this digitally alongside your passwords.</strong> Write it on paper and keep it somewhere safe (filing cabinet, safe, trusted family). This key is shown only once.
            </p>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative flex-shrink-0 mt-0.5">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
                className="sr-only" />
              <div className="w-5 h-5 rounded flex items-center justify-center transition-all"
                style={{ background: confirmed ? '#F0B429' : 'rgba(31,41,55,0.6)', border: `1px solid ${confirmed ? '#F0B429' : 'rgba(55,65,81,0.5)'}` }}>
                {confirmed && <Check size={12} color="#000" />}
              </div>
            </div>
            <span className="text-sm" style={{ color: 'var(--c-text-m)' }}>
              I have saved this recovery key in a secure location
            </span>
          </label>

          {/* Continue */}
          <button
            onClick={acknowledgeRecoveryKey}
            disabled={!confirmed}
            className="btn-primary w-full py-3 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShieldCheck size={16} />
            Continue to Vault
          </button>
        </div>
      </div>
    </div>
  );
}
