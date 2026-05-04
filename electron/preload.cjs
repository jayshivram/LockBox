const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    electron: process.versions.electron,
  },
  onLockVault: (callback) => ipcRenderer.on('lock-vault', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // ── Desktop biometric (Windows Hello / Touch ID) ────────────────────────
  /** Returns true if OS biometric auth is available on this machine. */
  isBiometricAvailable: () => ipcRenderer.invoke('biometric:available'),
  /** Prompts the OS biometric dialog. Resolves with { success: boolean, reason?: string }. */
  checkBiometric: (reason) => ipcRenderer.invoke('biometric:check', reason),

  // ── Window lifecycle events for soft-lock ────────────────────────────────
  onWindowBlur: (callback) => ipcRenderer.on('window:blur', callback),
  onWindowFocus: (callback) => ipcRenderer.on('window:focus', callback),
});
