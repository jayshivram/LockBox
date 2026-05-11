import { useEffect, useState } from 'react';
import { Fingerprint, Lock, AlertCircle, KeyRound, ShieldX } from 'lucide-react';
import { checkBiometric, isBiometricAvailable, isNative } from '../utils/capacitor';
import { App } from '@capacitor/app';

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
  /**
   * Whether this is a background resume (soft lock) rather than a cold start.
   */
  isSoftLock?: boolean;
}

/**
 * Full-screen biometric gate.
 * - Shown on native BOTH on cold start (before master password) AND on
 *   background resume (soft-lock).
 * - Checks hardware availability first before firing the prompt.
 * - Uses typed error results from checkBiometric() to give the user
 *   meaningful feedback instead of a generic "failed" message.
 */
export function BiometricGate({ onSuccess, onFallback, isSoftLock }: Props) {
  const [status, setStatus] = useState<GateStatus>('checking');
  const [message, setMessage] = useState('Checking sensor…');

  const triggerBiometric = async () => {
    setStatus('waiting');
    setMessage('Touch the sensor or use your device PIN');

    const result = await checkBiometric({
      cancelTitle: isSoftLock ? 'Cancel' : 'Use Master Password',
    });

    if (result.success) {
      onSuccess();
      return;
    }

    switch (result.reason) {
      case 'cancelled':
        if (!isSoftLock) {
          onFallback();
        } else {
          setStatus('failed');
          setMessage('Authentication cancelled. Tap to try again.');
        }
        break;
      case 'lockout':
        setStatus('lockout');
        setMessage(isSoftLock ? 'Biometric locked out. Tap to try again.' : 'Biometric locked out. Use your master password.');
        break;
      case 'unavailable':
        setStatus('unavailable');
        setMessage(isSoftLock ? 'Biometric sensor unavailable.' : 'Biometric sensor not available. Use your master password.');
        break;
      default:
        setStatus('failed');
        setMessage('Could not read your biometric. Tap to try again.');
    }
  };

  useEffect(() => {
    let cancelled = false;
    // Used to debounce the biometric trigger when the app briefly becomes
    // "active" in the Android recents switcher. Without this debounce, Android
    // forces the app to foreground to show the biometric dialog — causing the
    // aggressive full-screen popup while the user is just browsing recents.
    const resumeTimer = { current: null as ReturnType<typeof setTimeout> | null };

    const init = async () => {
      // Pre-flight: verify the sensor is actually ready before firing the prompt.
      const available = await isBiometricAvailable();
      if (cancelled) return;

      if (!available) {
        setStatus('unavailable');
        setMessage('No biometric enrolled on this device.');
        return;
      }

      // DO NOT fire the prompt if the app is currently in the background!
      // Doing so will cause Android to aggressively yank the app back to the foreground.
      if (isNative()) {
        const state = await App.getState();
        if (!state.isActive) {
          setStatus('waiting');
          // Wait for the app to come back to the foreground before triggering.
          const handle = await App.addListener('appStateChange', (s) => {
            if (s.isActive && !cancelled) {
              // Debounce: wait 600 ms to confirm the app is truly in the
              // foreground (not just briefly visible in the recents switcher).
              if (resumeTimer.current) clearTimeout(resumeTimer.current);
              resumeTimer.current = setTimeout(() => {
                if (!cancelled) {
                  handle.remove();
                  triggerBiometric();
                }
              }, 600);
            } else if (!s.isActive) {
              // App went back to background — cancel any pending trigger.
              if (resumeTimer.current) {
                clearTimeout(resumeTimer.current);
                resumeTimer.current = null;
              }
            }
          });
          return;
        }
      }

      // Sensor is ready and app is active — fire the prompt immediately.
      triggerBiometric();
    };

    init();
    return () => {
      cancelled = true;
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
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

        {/* Fallback to master password (hidden entirely during soft-lock) */}
        {!isSoftLock && (
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
        )}

      </div>
    </div>
  );
}
