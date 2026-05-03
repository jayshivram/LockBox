import { useEffect, useState } from 'react';
import { Fingerprint, Lock, AlertCircle, KeyRound, ShieldX } from 'lucide-react';
import { checkBiometric, isBiometricAvailable } from '../utils/capacitor';

type GateStatus = 'checking' | 'waiting' | 'failed' | 'lockout' | 'unavailable';

interface Props {
  /**
   * Called when biometric verification succeeds.
   * For a soft-lock resume this triggers softUnlock().
   * For a cold start this marks the biometric step complete.
   */
  onSuccess: () => void;
  /**
   * Called when the user explicitly chooses to fall back to the master password
   * OR when biometrics are permanently unavailable/locked out.
   * This triggers a hard lock so the master password screen is shown.
   */
  onFallback: () => void;
}

/**
 * Full-screen biometric gate.
 * - Shown on native BOTH on cold start (before master password) AND on
 *   background resume (soft-lock).
 * - Checks hardware availability first before firing the prompt.
 * - Uses typed error results from checkBiometric() to give the user
 *   meaningful feedback instead of a generic "failed" message.
 */
export function BiometricGate({ onSuccess, onFallback }: Props) {
  const [status, setStatus] = useState<GateStatus>('checking');
  const [message, setMessage] = useState('Checking sensor…');

  const triggerBiometric = async () => {
    setStatus('waiting');
    setMessage('Touch the sensor or use your device PIN');

    const result = await checkBiometric();

    if (result.success) {
      onSuccess();
      return;
    }

    switch (result.reason) {
      case 'cancelled':
        // User deliberately cancelled — fall back to master password
        onFallback();
        break;
      case 'lockout':
        setStatus('lockout');
        setMessage('Biometric locked out — too many failed attempts. Use your master password.');
        break;
      case 'unavailable':
        setStatus('unavailable');
        setMessage('Biometric sensor not available on this device. Use your master password.');
        break;
      default:
        setStatus('failed');
        setMessage('Could not read your biometric. Tap to try again.');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // Pre-flight: verify the sensor is actually ready before firing the prompt.
      const available = await isBiometricAvailable();
      if (cancelled) return;

      if (!available) {
        setStatus('unavailable');
        setMessage('No biometric enrolled on this device.');
        return;
      }

      // Sensor is ready — fire the prompt immediately (no arbitrary setTimeout).
      triggerBiometric();
    };

    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isTerminal = status === 'lockout' || status === 'unavailable';
  const iconColor = isTerminal ? '#EF4444' : status === 'failed' ? '#F97316' : 'var(--c-accent)';
  const ringColor = isTerminal
    ? 'rgba(239,68,68,0.35)'
    : status === 'failed'
    ? 'rgba(249,115,22,0.3)'
    : 'var(--c-accent-bd)';
  const ringBg = isTerminal
    ? 'rgba(239,68,68,0.08)'
    : status === 'failed'
    ? 'rgba(249,115,22,0.08)'
    : 'var(--c-accent-bg)';

  return (
    <div className="fixed inset-0 vault-bg z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="h-full flex flex-col items-center justify-center px-8">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-bd)' }}
          >
            <Lock size={28} color="var(--c-accent)" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--c-text)' }}>LockBox</h1>
            <p className="text-xs" style={{ color: 'var(--c-text-f)' }}>Identity verification required</p>
          </div>
        </div>

        {/* Biometric ring button */}
        <button
          onClick={isTerminal ? undefined : triggerBiometric}
          disabled={isTerminal || status === 'checking'}
          className="w-28 h-28 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:cursor-default"
          style={{
            background: ringBg,
            border: `2px solid ${ringColor}`,
            boxShadow: `0 0 0 8px ${ringBg}`,
          }}
        >
          {isTerminal ? (
            <ShieldX size={48} color={iconColor} />
          ) : status === 'failed' ? (
            <AlertCircle size={48} color={iconColor} />
          ) : (
            <Fingerprint size={48} color={iconColor} />
          )}
        </button>

        <p className="mt-7 text-base font-semibold text-center" style={{ color: 'var(--c-text)', maxWidth: 280 }}>
          {status === 'checking' ? 'Initialising…' :
           status === 'waiting' ? 'Verify your identity' :
           status === 'failed'  ? 'Authentication failed' :
           status === 'lockout' ? 'Sensor locked out' : 'Sensor unavailable'}
        </p>

        <p className="mt-2 text-sm text-center" style={{ color: 'var(--c-text-m)', maxWidth: 300 }}>
          {message}
        </p>

        {/* Tap-to-retry hint for transient failures */}
        {status === 'failed' && (
          <p className="mt-1 text-xs" style={{ color: 'var(--c-text-f)' }}>
            Tap the sensor icon to try again
          </p>
        )}

        {/* Fallback to master password */}
        <button
          onClick={onFallback}
          className="mt-10 flex items-center gap-2 text-sm font-medium px-5 py-3 rounded-xl transition-all"
          style={{
            background: 'var(--c-hover)',
            color: 'var(--c-text-m)',
            border: '1px solid var(--c-border)',
          }}
        >
          <KeyRound size={14} />
          Use master password instead
        </button>

      </div>
    </div>
  );
}
