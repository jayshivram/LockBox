/**
 * Capacitor utility helpers.
 * All functions are safe to call in a web browser — they no-op gracefully
 * when not running inside a native Capacitor container.
 */

/** Returns true when running inside a Capacitor native app (iOS / Android). */
export function isNative(): boolean {
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
 * Result from a biometric authentication attempt.
 */
export type BiometricResult =
  | { success: true }
  | { success: false; reason: 'cancelled' | 'lockout' | 'unavailable' | 'error' };

/**
 * Prompt the user with biometric authentication.
 *
 * - `allowDeviceCredential: true` lets Android fall back to PIN/Pattern if the
 *   fingerprint sensor can't read (wet fingers, etc.). This is the single biggest
 *   fix for the "hit or miss" experience.
 * - Returns a typed result so the caller can react to *why* it failed, instead
 *   of treating every failure identically.
 */
export async function checkBiometric(): Promise<BiometricResult> {
  if (!isNative()) return { success: false, reason: 'unavailable' };
  try {
    const { BiometricAuth, BiometryErrorType } = await import('@aparajita/capacitor-biometric-auth');

    // First, verify the sensor/hardware is actually ready before firing the prompt.
    const check = await BiometricAuth.checkBiometry();
    if (!check.isAvailable) {
      return { success: false, reason: 'unavailable' };
    }

    await BiometricAuth.authenticate({
      reason: 'Verify your identity to access LockBox',
      cancelTitle: 'Use Master Password',
      // KEY FIX: Allow Android to offer PIN/Pattern if fingerprint fails.
      // This is the primary reason the prompt was "hit or miss" — the OS was
      // dismissing it silently when the sensor was unresponsive, with no fallback.
      allowDeviceCredential: true,
    });

    return { success: true };
  } catch (err: unknown) {
    // Inspect the error code to return a meaningful reason.
    // @aparajita/capacitor-biometric-auth throws a BiometryError with a `code` field.
    try {
      const { BiometryErrorType } = await import('@aparajita/capacitor-biometric-auth');
      const code = (err as { code?: string })?.code;
      if (
        code === BiometryErrorType.userCancel ||
        code === BiometryErrorType.systemCancel ||
        code === BiometryErrorType.appCancel
      ) {
        return { success: false, reason: 'cancelled' };
      }
      if (
        code === BiometryErrorType.biometryLockout
      ) {
        return { success: false, reason: 'lockout' };
      }
    } catch {
      // BiometryErrorType import failed — treat as generic error
    }
    return { success: false, reason: 'error' };
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
 * Register a callback to be invoked whenever the app changes foreground state.
 * - `onBackground`: called when the user leaves the app (soft-lock trigger).
 * - `onForeground`: called when the app comes back (biometric re-prompt trigger).
 *
 * Returns a cleanup function.
 */
export function setupAppStateListener(
  onBackground: () => void,
  onForeground?: () => void,
): (() => void) | undefined {
  if (!isNative()) return undefined;
  let cleanup: (() => void) | undefined;
  import('@capacitor/app').then(({ App }) => {
    const handle = App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        onBackground();
      } else {
        onForeground?.();
      }
    });
    cleanup = () => { handle.then(h => h.remove()); };
  });
  return () => { cleanup?.(); };
}
