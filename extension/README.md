# LockBox Browser Extension

Autofills passwords from your local LockBox vault on any website.

## Installation (Chrome / Edge / Brave)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select this `extension/` folder
5. The LockBox icon will appear in your toolbar

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `extension/manifest.json`

> **Note:** Firefox MV3 support is in progress. The extension may need minor adjustments for Firefox compatibility.

## Syncing Credentials

1. Open LockBox (the web or desktop app)
2. Go to **Settings** → **Browser Extension**
3. Click **Sync to Extension**
4. A confirmation message will appear in the extension popup

Your entries are stored locally inside the extension (Chrome's `storage.local`) — **never sent to any server**.

## Usage

- Click a password field on any login page
- A credential chip will appear with matching entries
- Click an entry to autofill username and password

## Security Notes

- Credentials are stored **only in the extension's local storage** on your device
- No network requests are made by the extension
- Use the **lock icon** in the popup to clear all stored credentials at any time
- Syncing replaces previously stored credentials

## Files

| File            | Purpose                                          |
|-----------------|--------------------------------------------------|
| `manifest.json` | MV3 extension manifest                           |
| `background.js` | Service worker — stores & serves credentials     |
| `content.js`    | Detects forms, injects autofill chip             |
| `popup.html`    | Extension popup UI                               |
| `popup.js`      | Popup logic — renders entries, copy buttons      |
| `popup.css`     | Popup styling                                    |

## Icons

Place PNG icons at:
- `icons/icon16.png`  (16×16)
- `icons/icon48.png`  (48×48)
- `icons/icon128.png` (128×128)

You can export these from the main LockBox logo assets in `ICONS/web/`.
