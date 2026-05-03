import { useEffect, useState } from 'react';
import { Fingerprint, Lock, AlertCircle } from 'lucide-react';
import { checkBiometric } from '../utils/capacitor';

interface Props {
  /** Called when biometric verification succeeds or user chooses to skip to master password. */
  onPass: () => void;
}

/**
 * Full-screen biometric gate shown on native before UnlockScreen.
 * Auto-triggers the biometric prompt on mount.
 */
export function BiometricGate({ onPass }: Props) {
  const [status, setStatus] = useState<'waiting' | 'failed'>('waiting');

  const triggerBiometric = async () => {
    setStatus('waiting');
    const passed = await checkBiometric();
    if (passed) {
      onPass();
    } else {
      setStatus('failed');
    }
  };

  useEffect(() => {
    // Small delay so the native biometric sheet renders cleanly after the
    // component mounts and Capacitor's WebView is ready.
    const id = setTimeout(triggerBiometric, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 vault-bg z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="h-full flex flex-col items-center justify-center px-8">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-12">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-bd)' }}>
          <Lock size={28} color="var(--c-accent)" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--c-text)' }}>LockBox</h1>
          <p className="text-xs" style={{ color: 'var(--c-text-f)' }}>Your vault is locked</p>
        </div>
      </div>

      {/* Biometric icon */}
      <button
        onClick={triggerBiometric}
        className="w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-95"
        style={{
          background: status === 'failed' ? 'rgba(239,68,68,0.1)' : 'var(--c-accent-bg)',
          border: `2px solid ${status === 'failed' ? 'rgba(239,68,68,0.4)' : 'var(--c-accent-bd)'}`,
        }}
      >
        {status === 'failed'
          ? <AlertCircle size={44} color="#EF4444" />
          : <Fingerprint size={44} color="var(--c-accent)" />
        }
      </button>

      <p className="mt-6 text-base font-semibold" style={{ color: 'var(--c-text)' }}>
        {status === 'failed' ? 'Authentication failed' : 'Touch the sensor'}
      </p>
      <p className="mt-1 text-sm" style={{ color: 'var(--c-text-m)' }}>
        {status === 'failed' ? 'Tap the fingerprint to try again' : 'Use fingerprint or face to unlock'}
      </p>

      {/* Fallback to master password */}
      <button
        onClick={onPass}
        className="mt-10 text-sm font-medium px-5 py-2.5 rounded-xl transition-all"
        style={{
          background: 'var(--c-hover)',
          color: 'var(--c-text-m)',
          border: '1px solid var(--c-border)',
        }}
      >
        Use master password instead
      </button>
      </div>
    </div>
  );
}
