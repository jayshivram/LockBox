/**
 * Capacitor utility helpers.
 * All functions are safe to call in a web browser — they no-op gracefully
 * when not running inside a native Capacitor container.
 */

import { Capacitor } from '@capacitor/core';

/** Returns true when running inside a Capacitor native app (iOS / Android). */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Returns true when running inside the Electron desktop wrapper. */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && 'electronAPI' in window;
}

/** Returns true when running in any managed runtime (native mobile OR desktop). */
export function isNativeOrElectron(): boolean {
  return isNative() || isElectron();
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
export async function checkBiometric(options?: { cancelTitle?: string }): Promise<BiometricResult> {
  // Desktop: delegate to Electron main process (Windows Hello / Touch ID)
  if (isElectron()) {
    const api = (window as any).electronAPI;
    const result = await api.checkBiometric('Verify your identity to access LockBox') as BiometricResult;
    return result;
  }

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
      cancelTitle: options?.cancelTitle || 'Use Master Password',
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
  if (isElectron()) {
    const api = (window as any).electronAPI;
    return api.isBiometricAvailable() as Promise<boolean>;
  }
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
 * Trigger a light haptic impact on native platforms (no-op on web/desktop).
 */
export async function triggerHaptic(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Plugin not available — fail silently
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
  
  let isCancelled = false;
  let pluginHandle: any = null;

  import('@capacitor/app').then(({ App }) => {
    if (isCancelled) return;
    
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        onBackground();
      } else {
        onForeground?.();
      }
    }).then(handle => {
      if (isCancelled) {
        handle.remove();
      } else {
        pluginHandle = handle;
      }
    });
  });

  return () => {
    isCancelled = true;
    if (pluginHandle) {
      pluginHandle.remove();
    }
  };
}

/**
 * Helper to require inline biometrics before performing sensitive actions.
 * If biometric is not enabled or not on native, it returns true immediately.
 */
export async function requireInlineBiometric(biometricEnabled: boolean): Promise<boolean> {
  if ((!isNative() && !isElectron()) || !biometricEnabled) {
    return true;
  }
  
  const result = await checkBiometric({ cancelTitle: 'Cancel' });
  return result.success === true;
}
