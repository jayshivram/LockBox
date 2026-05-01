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
});
