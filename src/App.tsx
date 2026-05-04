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

    const cleanup = setupAppStateListener(
      // ── onBackground ──────────────────────────────────────────────────────
      () => {
        isForeground.current = false;
        if (settings.biometricEnabled && isUnlocked) {
          // Soft-lock: keep the decrypted vault in RAM but block the UI.
          // The biometric gate will re-appear on resume.
          softLock();
        } else if (isUnlocked) {
          // Biometrics disabled — hard lock on background (original behavior).
          lock();
        }
      },
      // ── onForeground ──────────────────────────────────────────────────────
      () => {
        isForeground.current = true;
        // Nothing extra needed here: if the vault was soft-locked, isSoftLocked
        // in the store will already be true and the BiometricGate is rendered.
        // If it was hard-locked, the unlock screen is already showing.
      },
    );

    return () => { cleanup?.(); };
    // We intentionally include `isUnlocked` and `settings.biometricEnabled`
    // so the closure always reflects the latest values.
  }, [lock, softLock, isUnlocked, settings.biometricEnabled]);

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
