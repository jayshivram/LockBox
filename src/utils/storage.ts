/**
 * Android-safe persistent backup for critical vault keys.
 *
 * Problem: Android's WebView localStorage is scoped to the app's WebView data
 * directory and can be wiped when:
 *   - The user installs a differently-signed APK over an existing install
 *   - The user uninstalls then reinstalls the app
 *
 * Solution: Mirror the two critical keys to @capacitor/preferences
 * (backed by Android SharedPreferences) on every write, and restore them
 * back to localStorage on cold start before anything else reads it.
 *
 * All functions are safe to call on web / Electron — they no-op when
 * not running inside a native Capacitor container.
 */

import { Capacitor } from '@capacitor/core';

const VAULT_KEY     = 'lockbox_vault';
const BIOMETRIC_KEY = 'lockbox_biometric';

/** Keys that survive an app update / reinstall via Preferences backup. */
const BACKED_UP_KEYS = [VAULT_KEY, BIOMETRIC_KEY] as const;

function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * On app boot, restore any keys from Preferences that are missing from
 * localStorage. This runs before the vault store initialises, so the
 * store will find the data it expects even after an app update wipe.
 */
export async function restoreVaultFromBackup(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const { Preferences } = await import('@capacitor/preferences');

    for (const key of BACKED_UP_KEYS) {
      // Only restore if localStorage is genuinely empty for this key
      if (localStorage.getItem(key) !== null) continue;

      const { value } = await Preferences.get({ key });
      if (value !== null) {
        localStorage.setItem(key, value);
      }
    }
  } catch {
    // Plugin unavailable or Preferences read failed — fail silently.
    // The app will still function; the user may need to re-enter their
    // master password if the vault data was genuinely lost.
  }
}

/**
 * Mirror a localStorage write to Preferences. Fire-and-forget.
 * Errors are swallowed — the localStorage write already succeeded.
 */
export function backupToPreferences(key: string, value: string): void {
  if (!isNativePlatform()) return;

  import('@capacitor/preferences')
    .then(({ Preferences }) => Preferences.set({ key, value }))
    .catch(() => { /* intentionally silent */ });
}

/**
 * Remove a key from Preferences (call alongside localStorage.removeItem).
 * Fire-and-forget.
 */
export function removeFromPreferences(key: string): void {
  if (!isNativePlatform()) return;

  import('@capacitor/preferences')
    .then(({ Preferences }) => Preferences.remove({ key }))
    .catch(() => { /* intentionally silent */ });
}
