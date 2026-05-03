import { useEffect, useRef, useState } from 'react';
import { useVaultStore } from './store/vaultStore';
import { UnlockScreen } from './components/UnlockScreen';
import { SetupScreen } from './components/SetupScreen';
import { Layout } from './components/Layout';
import { BiometricGate } from './components/BiometricGate';
import { isNative, setupPrivacyScreen, setupAppStateListener } from './utils/capacitor';

export default function App() {
  const { isUnlocked, isSoftLocked, isSetup, settings, lock, softLock, softUnlock } = useVaultStore();

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

  // When the vault HARD-locks, reset the cold-start biometric flag so the
  // biometric step is required again on the next unlock attempt.
  useEffect(() => {
    if (!isNative()) return;
    if (!isUnlocked && !isSoftLocked) {
      setBiometricCleared(false);
    }
  }, [isUnlocked, isSoftLocked]);

  // ── Render logic ────────────────────────────────────────────────────────────

  if (!isSetup) return <SetupScreen />;

  // ── SOFT-LOCK: App resumed from background ──────────────────────────────────
  // The vault data is still in RAM. Show biometric gate; on success → resume.
  // On fallback → hard lock → master password screen.
  if (isSoftLocked) {
    return (
      <BiometricGate
        onSuccess={() => softUnlock()}
        onFallback={() => lock()}
      />
    );
  }

  // ── HARD-LOCK / COLD START with biometrics enabled ──────────────────────────
  // The user must pass biometrics FIRST, then enter the master password.
  if (!isUnlocked && isNative() && settings.biometricEnabled && !biometricCleared) {
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
        biometricVerified={isNative() && settings.biometricEnabled && biometricCleared}
      />
    );
  }

  return <Layout />;
}
