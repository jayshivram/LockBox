const { app, BrowserWindow, shell, ipcMain, systemPreferences } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'LockBox',
    backgroundColor: '#070B14',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    icon: path.join(__dirname, '../public/icon.png'),
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Forward window focus/blur to renderer for soft-lock behaviour
  mainWindow.on('blur', () => {
    if (mainWindow) mainWindow.webContents.send('window:blur');
  });
  mainWindow.on('focus', () => {
    if (mainWindow) mainWindow.webContents.send('window:focus');
  });
}

// ── Desktop biometric helpers ─────────────────────────────────────────────────

/**
 * Encode a PowerShell script for use with -EncodedCommand.
 * PowerShell's -EncodedCommand expects a UTF-16 LE base64 string.
 */
function psEncode(script) {
  return Buffer.from(script, 'utf16le').toString('base64');
}

/**
 * Run a PowerShell script via -EncodedCommand.
 * Resolves with the exit code (never rejects).
 */
function runPS(script, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const encoded = psEncode(script);
    const child = execFile(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded],
      { timeout: timeoutMs, windowsHide: true },
      (err) => resolve(err ? (err.code ?? 99) : 0),
    );
    // If something goes wrong resolving the process handle, just resolve
    child.on('error', () => resolve(99));
  });
}

/** Returns true if desktop biometric / Windows Hello is available on this machine. */
async function desktopBiometricAvailable() {
  if (process.platform === 'darwin') {
    try { return systemPreferences.canPromptTouchID(); } catch { return false; }
  }
  if (process.platform === 'win32') {
    const code = await runPS(`
      try {
        $null = [Windows.Security.Credentials.UI.UserConsentVerifier,Windows.Security.Credentials.UI,ContentType=WindowsRuntime]
        $a = [Windows.Security.Credentials.UI.UserConsentVerifier]::CheckAvailabilityAsync().GetAwaiter().GetResult()
        if ($a -eq 'Available') { exit 0 } else { exit 1 }
      } catch { exit 2 }
    `);
    return code === 0;
  }
  return false;
}

/** Prompts the user with OS biometric / Windows Hello. Returns a typed result. */
async function promptDesktopBiometric(reason) {
  if (process.platform === 'darwin') {
    try {
      await systemPreferences.promptTouchID(reason);
      return { success: true };
    } catch (err) {
      const msg = String(err?.message ?? '').toLowerCase();
      if (msg.includes('cancel') || msg.includes('user')) return { success: false, reason: 'cancelled' };
      if (msg.includes('lockout') || msg.includes('too many')) return { success: false, reason: 'lockout' };
      return { success: false, reason: 'error' };
    }
  }

  if (process.platform === 'win32') {
    const encodedReason = reason.replace(/'/g, '');
    const code = await runPS(`
      try {
        $null = [Windows.Security.Credentials.UI.UserConsentVerifier,Windows.Security.Credentials.UI,ContentType=WindowsRuntime]
        $r = [Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync('${encodedReason}').GetAwaiter().GetResult()
        if ($r -eq 'Verified') { exit 0 }
        elseif ($r -eq 'DeviceNotPresent' -or $r -eq 'DisabledByPolicy' -or $r -eq 'NotConfiguredForUser') { exit 2 }
        else { exit 1 }
      } catch { exit 2 }
    `);
    if (code === 0) return { success: true };
    if (code === 2) return { success: false, reason: 'unavailable' };
    return { success: false, reason: 'cancelled' };
  }

  return { success: false, reason: 'unavailable' };
}

// ── IPC: biometric ────────────────────────────────────────────────────────────
ipcMain.handle('biometric:available', async () => desktopBiometricAvailable());
ipcMain.handle('biometric:check', async (_, reason) => promptDesktopBiometric(reason ?? 'Verify your identity'));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Security: prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    const distDir = `file://${path.join(__dirname, '../dist').replace(/\\/g, '/')}`;
    const allowedDev  = isDev && url.startsWith('http://localhost:5173');
    const allowedProd = !isDev && url.startsWith(distDir);
    if (!allowedDev && !allowedProd) {
      event.preventDefault();
    }
  });
});
