import { useEffect, useRef, useState } from 'react';
import { useVaultStore } from './store/vaultStore';
import { UnlockScreen } from './components/UnlockScreen';
import { SetupScreen } from './components/SetupScreen';
import { Layout } from './components/Layout';
import { BiometricGate } from './components/BiometricGate';
import { isNative, isElectron, isNativeOrElectron, setupPrivacyScreen, setupAppStateListener } from './utils/capacitor';
import { restoreVaultFromBackup } from './utils/storage';

export default function App() {
  const { isUnlocked, isSoftLocked, isSetup, settings, lock, softLock, softUnlock } = useVaultStore();

  // `ready` is false until the pre-boot Preferences restore completes.
  // This prevents any store reads from racing with the restore on native.
  const [ready, setReady] = useState(!isNative());

  /**
   * `biometricCleared` tracks whether the biometric gate has been passed for
   * the CURRENT cold-start session. On cold start with biometrics enabled, the
   * user must pass the biometric gate FIRST, then enter the master password.
   * It resets to false each time the vault performs a hard lock.
   *
   * For BACKGROUND RESUME the soft-lock / soft-unlock flow is used instead
   * (isSoftLocked in the store), which does not require re-entering the master
   * password on successful biometric scan.
   */
  const [biometricCleared, setBiometricCleared] = useState(false);

  // Restore vault data from Android Preferences backup before anything else
  // reads localStorage. Completes in <100 ms on native; instant on web.
  useEffect(() => {
    if (!isNative()) return; // already set to true via useState initialiser
    restoreVaultFromBackup().then(() => {
      // Re-sync the biometric setting from localStorage (may have been restored)
      const biometricEnabled = localStorage.getItem('lockbox_biometric') !== 'false';
      useVaultStore.setState(s => ({
        settings: { ...s.settings, biometricEnabled },
      }));
      setReady(true);
    });
  }, []);

  // Track whether the app is currently in the foreground to avoid firing the
  // biometric prompt twice in rapid succession on fast resume.
  const isForeground = useRef(true);

  /**
   * Grace-period timer: delays soft/hard lock when the app goes to background.
   * If the user returns within the grace window, the timer is cancelled and
   * the vault stays fully unlocked — no biometric prompt, no data loss.
   * Default grace = 30 s (configurable in Settings → Security).
   */
  const backgroundLockRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply / remove .light class on <html> whenever the theme setting changes
  useEffect(() => {
    const html = document.documentElement;
    if (settings.theme === 'light') {
      html.classList.add('light');
    } else {
      html.classList.remove('light');
    }
  }, [settings.theme]);

  // Set up native-only features once on mount
  useEffect(() => {
    if (!isNative()) return;
    setupPrivacyScreen();

    const grace = (settings.backgroundGracePeriodSeconds ?? 30) * 1000;

    const doLock = () => {
      backgroundLockRef.current = null;
      if (settings.biometricEnabled && isUnlocked) {
        // Soft-lock: keep the decrypted vault in RAM but block the UI.
        softLock();
      } else if (isUnlocked) {
        // Biometrics disabled — hard lock on background.
        lock();
      }
    };

    const cleanup = setupAppStateListener(
      // ── onBackground ──────────────────────────────────────────────────────
      () => {
        isForeground.current = false;
        if (!isUnlocked) return; // already locked, nothing to do
        // Cancel any existing pending lock (re-entry into background)
        if (backgroundLockRef.current) clearTimeout(backgroundLockRef.current);
        if (grace > 0) {
          // Delay locking — if the user returns within the grace period
          // (e.g. quickly copying from another app), no lock fires at all.
          backgroundLockRef.current = setTimeout(doLock, grace);
        } else {
          doLock();
        }
      },
      // ── onForeground ──────────────────────────────────────────────────────
      () => {
        isForeground.current = true;
        // If the user returned before the grace timer fired, cancel it.
        // The vault stays fully unlocked — no biometric prompt needed.
        if (backgroundLockRef.current) {
          clearTimeout(backgroundLockRef.current);
          backgroundLockRef.current = null;
        }
        // If the vault was already soft-locked (grace expired before resume),
        // isSoftLocked is already true and BiometricGate handles the rest.
      },
    );

    return () => {
      cleanup?.();
      if (backgroundLockRef.current) {
        clearTimeout(backgroundLockRef.current);
        backgroundLockRef.current = null;
      }
    };
    // Include grace period in deps so the closure always reflects the latest value.
  }, [lock, softLock, isUnlocked, settings.biometricEnabled, settings.backgroundGracePeriodSeconds]);

  // Set up Electron window blur/focus for soft-lock on desktop
  useEffect(() => {
    if (!isElectron()) return;
    const api = (window as any).electronAPI;

    const handleBlur = (_event: any) => {
      if (settings.biometricEnabled && isUnlocked) {
        softLock();
      } else if (isUnlocked) {
        lock();
      }
    };

    api.onWindowBlur(handleBlur);

    return () => {
      api.removeAllListeners('window:blur');
      api.removeAllListeners('window:focus');
    };
  }, [lock, softLock, isUnlocked, settings.biometricEnabled]);

  // When the vault HARD-locks, reset the cold-start biometric flag so the
  // biometric step is required again on the next unlock attempt.
  useEffect(() => {
    if (!isNativeOrElectron()) return;
    if (!isUnlocked && !isSoftLocked) {
      setBiometricCleared(false);
    }
  }, [isUnlocked, isSoftLocked]);

  // ── Render logic ────────────────────────────────────────────────────────────

  // Wait for the Preferences restore to complete before rendering anything.
  // On web this is always true immediately; on native it takes <100 ms.
  if (!ready) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: '#0d1740',
        }}
      />
    );
  }

  if (!isSetup) return <SetupScreen />;

  // ── HARD-LOCK / COLD START with biometrics enabled ──────────────────────────
  // The user must pass biometrics FIRST, then enter the master password.
  if (!isUnlocked && isNativeOrElectron() && settings.biometricEnabled && !biometricCleared) {
    return (
      <BiometricGate
        onSuccess={() => setBiometricCleared(true)}
        onFallback={() => {
          // User chose to skip biometrics — go straight to master password.
          setBiometricCleared(true);
        }}
      />
    );
  }

  // ── HARD-LOCK / COLD START: master password screen ─────────────────────────
  if (!isUnlocked) {
    return (
      <UnlockScreen
        biometricVerified={isNativeOrElectron() && settings.biometricEnabled && biometricCleared}
      />
    );
  }

  return (
    <>
      <Layout />
      {isSoftLocked && (
        <BiometricGate
          isSoftLock={true}
          onSuccess={() => softUnlock()}
          onFallback={() => lock()}
        />
      )}
    </>
  );
}
