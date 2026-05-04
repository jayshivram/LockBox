/**
 * Type declarations for the Electron contextBridge API injected into `window`.
 * Only present when the app is running inside the Electron desktop wrapper.
 */

type BiometricResult =
  | { success: true }
  | { success: false; reason: 'cancelled' | 'lockout' | 'unavailable' | 'error' };

interface ElectronAPI {
  /** The OS platform string, e.g. 'win32' | 'darwin' | 'linux'. */
  platform: string;
  versions: { node: string; electron: string };

  /** Register a callback fired when the main process requests a vault lock. */
  onLockVault: (callback: (...args: any[]) => void) => void;
  /** Remove all IPC listeners for the given channel. */
  removeAllListeners: (channel: string) => void;

  /** Returns true if Windows Hello / Touch ID is configured and available. */
  isBiometricAvailable: () => Promise<boolean>;
  /** Prompts the OS biometric dialog and returns the result. */
  checkBiometric: (reason?: string) => Promise<BiometricResult>;

  /** Register a callback fired when the Electron window loses focus. */
  onWindowBlur: (callback: (...args: any[]) => void) => void;
  /** Register a callback fired when the Electron window gains focus. */
  onWindowFocus: (callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
