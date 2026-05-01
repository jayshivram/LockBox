import { useEffect, useState } from 'react';
import { useVaultStore } from './store/vaultStore';
import { UnlockScreen } from './components/UnlockScreen';
import { SetupScreen } from './components/SetupScreen';
import { Layout } from './components/Layout';
import { BiometricGate } from './components/BiometricGate';
import { isNative, setupPrivacyScreen, setupAppStateListener } from './utils/capacitor';

export default function App() {
  const { isUnlocked, isSetup, settings, lock } = useVaultStore();

  /**
   * `biometricCleared` tracks whether the biometric gate has been passed for
   * the current locked session. It resets to false each time the vault locks,
   * so the gate re-appears on the next unlock attempt when biometric is on.
   */
  const [biometricCleared, setBiometricCleared] = useState(!isNative());

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
    const cleanup = setupAppStateListener(() => lock());
    return () => { cleanup?.(); };
  }, [lock]);

  // When the vault locks on native, require biometric again next unlock
  useEffect(() => {
    if (!isNative()) return;
    if (!isUnlocked) {
      setBiometricCleared(false);
    }
  }, [isUnlocked]);

  if (!isSetup) return <SetupScreen />;

  // On native: show biometric gate before master password screen
  if (!isUnlocked && isNative() && settings.biometricEnabled && !biometricCleared) {
    return <BiometricGate onPass={() => setBiometricCleared(true)} />;
  }

  if (!isUnlocked) return <UnlockScreen />;
  return <Layout />;
}
