/**
 * Capacitor utility helpers.
 * All functions are safe to call in a web browser — they no-op gracefully
 * when not running inside a native Capacitor container.
 */

/** Returns true when running inside a Capacitor native app (iOS / Android). */
export function isNative(): boolean {
  // Capacitor injects this global before our JS runs
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return typeof cap?.isNativePlatform === 'function' && cap.isNativePlatform();
}

/**
 * Enable the privacy/content shield:
 *  - Blocks the app from appearing in the Android recent-apps switcher screenshot
 *  - Prevents screenshots / screen recording inside the app
 */
export async function setupPrivacyScreen(): Promise<void> {
  if (!isNative()) return;
  try {
    const { PrivacyScreen } = await import('@capacitor/privacy-screen');
    await PrivacyScreen.enable();
  } catch {
    // Plugin not installed or platform unsupported — fail silently
  }
}

/**
 * Prompt the user with biometric authentication.
 * Returns `true` on success, `false` on cancellation or failure.
 */
export async function checkBiometric(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    await BiometricAuth.authenticate({
      reason: 'Verify your identity to access LockBox',
      cancelTitle: 'Use Master Password',
      allowDeviceCredential: false,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns true if the device has biometric hardware enrolled and ready.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    const result = await BiometricAuth.checkBiometry();
    return result.isAvailable;
  } catch {
    return false;
  }
}

/**
 * Register a callback to be invoked whenever the app moves to the background.
 * Used to auto-lock the vault when the user switches away.
 */
export function setupAppStateListener(onBackground: () => void): (() => void) | undefined {
  if (!isNative()) return undefined;
  let cleanup: (() => void) | undefined;
  import('@capacitor/app').then(({ App }) => {
    const handle = App.addListener('appStateChange', (state) => {
      if (!state.isActive) onBackground();
    });
    cleanup = () => { handle.then(h => h.remove()); };
  });
  return () => { cleanup?.(); };
}
