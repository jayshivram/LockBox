# 🔐 LockBox — Complete User & Troubleshooting Guide

A **secure, offline-first password manager** built with React + Electron. Zero-knowledge, AES-256-GCM encrypted, local-only storage. This guide covers startup, setup, usage, and comprehensive troubleshooting.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation & Setup](#installation--setup)
   - [Web Version (Browser)](#web-version-browser)
   - [Desktop Version (Electron)](#desktop-version-electron)
3. [First Time Setup](#first-time-setup)
4. [Core Features](#core-features)
5. [Keyboard Shortcuts](#keyboard-shortcuts)
6. [Recovery & Backup](#recovery--backup)
7. [Comprehensive Troubleshooting](#comprehensive-troubleshooting)
8. [Security & Privacy](#security--privacy)
9. [FAQ](#faq)

---

## Quick Start

### Web Version
```bash
npm install
npm run dev
# Opens http://localhost:5173
```

### Desktop Version
```bash
npm install
npm run electron:dev
```

### Create Master Password
1. Launch the app
2. Enter a **strong master password** (≥8 chars, mix of upper/lower/numbers/symbols)
3. **Write down or securely store your Recovery Key** (shown once, never again)
4. Click "Create My Vault"
5. **You're ready to use LockBox!**

⚠️ **IMPORTANT**: Your master password cannot be recovered. If you forget it AND lose your recovery key, your vault is permanently inaccessible. This is by design.

---

## Installation & Setup

### Requirements

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Modern browser** (Chrome, Firefox, Safari, Edge) for web version
- **macOS 10.15+**, **Windows 10+**, or **Linux** for desktop version

### Verify Installation

```bash
node --version  # Should be v18+
npm --version   # Should be v9+
```

### Clone & Install

```bash
git clone <repository-url>
cd lockbox
npm install
```

### Web Version (Browser)

**Best for**: Quick testing, shared machines, web-based workflows

```bash
npm run dev
```

- Opens automatically at `http://localhost:5173`
- Hot-reload enabled during development
- Data stored in browser's `localStorage`
- **Note**: Clearing browser data will delete your vault

**Production Build (Web)**
```bash
npm run build
# Output in ./dist/
# Deploy to Vercel, Netlify, GitHub Pages, or any static host
```

### Desktop Version (Electron)

**Best for**: Maximum security, offline capability, system integration

```bash
npm run electron:dev
```

This runs two concurrent processes:
1. Vite dev server (handles reloads)
2. Electron window (auto-restarts)

**Building Desktop Apps**

```bash
# For your current OS
npm run electron:build

# Output in ./dist/
# Creates .exe (Windows), .dmg (macOS), .AppImage (Linux)
```

---

## First Time Setup

### Step 1: Create Master Password

**What you need to know:**
- **Minimum 8 characters**
- Must include: uppercase, lowercase, numbers, special characters
- **The longer, the better** (16+ chars recommended)
- Write it down or use your own password manager
- This is your **only** way to unlock the vault

**Example of a strong password:**
```
MyVault2026!@#Secure
```

### Step 2: Save Your Recovery Key

**What is it?**
- A 24-character code (XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX)
- Provides 144 bits of entropy
- Can unlock your vault if you forget your master password
- **Shown only once** — you cannot retrieve it from the app later

**How to save it:**
1. ✅ **Print it** and store in a safe (best option)
2. ✅ **Write it by hand** on paper and store safely
3. ✅ Store in a separate, encrypted password manager (NOT in LockBox)
4. ❌ **Do NOT** save it in plain text on your computer
5. ❌ **Do NOT** store it in email

**The Modal Confirms:**
You must check "I have saved this recovery key in a secure location" before continuing.

### Step 3: Add Your First Entry

Click the **+ button** in the vault list (or press `Ctrl+N`) to add:
- **Login**: Username, password, URL
- **Note**: Encrypted text (recovery codes, seed phrases)
- **WiFi**: Network SSID and password
- **API Key**: For services and integrations
- **TOTP**: 2FA secret key

---

## Core Features

### 🔓 Unlocking the Vault

**On startup**, enter your master password. The app:
1. Derives a cryptographic key from your password using PBKDF2
2. Uses that key to unlock your Data Encryption Key (DEK)
3. Decrypts your vault
4. Loads all entries into memory

**Forgot your password?**
- Click "Forgot password? Use Recovery Key" on the unlock screen
- Enter your 24-character recovery key
- You'll be directed to Settings to set a **new master password**
- A new recovery key is automatically generated

### 📋 Adding Entries

1. Click **+ (Add)** button or press `Ctrl+N`
2. Choose entry type
3. Fill in fields (categories, tags, URLs, etc.)
4. Click **Save**

**Entry Types:**

| Type | Fields | Use Case |
|------|--------|----------|
| **Login** | Name, username, password, URL, tags | Websites, apps |
| **Note** | Name, encrypted text, tags | Recovery codes, PINs |
| **WiFi** | Network name, password, admin URL | Home/guest networks |
| **API Key** | Key name, key value | Services, integrations |
| **TOTP** | Account name, Base32 secret | Google Authenticator |

### 🔍 Searching & Filtering

**Search** (top left): Finds entries by name, username, URL, SSID, tags

**Filters** (below search):
- **All**: Show all entries
- **Logins**: Username/password entries
- **Notes**: Encrypted notes
- **2FA**: TOTP codes
- **API Keys**: API credentials
- **WiFi**: Network passwords
- **⭐ Favorites**: Starred entries
- **⚠️ Breached**: Compromised passwords (marked by breach check)

**Sort** (above entry list):
- **A → Z**: Alphabetical ascending
- **Z → A**: Alphabetical descending
- **Newest**: Recently updated first
- **Oldest**: Oldest entries first
- **Strength**: Strongest passwords first

### 🔑 Password Generator

1. Click **Generator** in sidebar
2. Configure options:
   - Length: 8–64 characters
   - Uppercase (A-Z)
   - Lowercase (a-z)
   - Numbers (0-9)
   - Symbols (!@#$%...)
   - Exclude ambiguous chars (0, O, l, 1, etc.)
3. Click **Generate** (or click the refresh icon repeatedly)
4. Click **Copy** to copy to clipboard

**Password Strength Meter:**
- 🔴 Very Weak: 0–30 bits entropy
- 🟠 Weak: 31–50 bits
- 🟡 Fair: 51–70 bits
- 🟢 Strong: 71–100 bits
- 🟢 Very Strong: 100+ bits

**Passphrase Mode:** Generate human-readable passphrases from word lists (easier to memorize)

### 🔐 2FA Manager (TOTP)

1. Click **Authenticator** in sidebar
2. Click **+ Add Account**
3. Enter account name and Base32 secret key
4. Click **Test Secret** to verify
5. Click **Add Account**

**Where to find your 2FA secret:**
- Most services show it as a QR code or Base32 text
- Example: `JBSWY3DPEHPK3PXP`
- Some services don't show it after setup (save it before confirming!)

**Using codes:**
- Codes auto-refresh every 30 seconds
- Click copy icon to copy code to clipboard
- Timer ring shows seconds until next refresh
- 🔴 Red = <5 seconds (code about to change)

### 📝 Secure Notes

1. Click **Notes** in sidebar
2. Click **+ Create Note**
3. Enter title and content
4. Add tags/category
5. Save

**Use cases:**
- Backup codes (from Google, Microsoft, etc.)
- Private keys (crypto, SSH)
- PINs and security questions
- Legal documents and contracts

All notes are **encrypted with the same AES-256-GCM** as passwords.

### ⚙️ Settings

**Auto-Lock Timer:**
- Never, 1min, 5min, 15min, 30min, 1 hour
- 30 seconds before lock fires, a warning toast appears
- Click **Snooze** to extend (or move mouse/type)

**Clipboard Clear Delay:**
- 10s, 15s, 30s, 1min, Never
- After copying, the text is automatically cleared

**Master Password:**
- Click **Change Master Password** to set a new one
- Old password required for verification
- New recovery key is auto-generated and displayed

**Password Hint:**
- Optional reminder shown on the unlock screen
- **Never put your actual password here!**
- Example: "City where I was born + graduation year"

**Recovery Key:**
- View your current recovery key (only if vault is v2)
- Generate a new one by changing your master password

**Export/Import:**

**Export Options:**
- **Plain JSON**: Unencrypted (keep offline!)
- **Encrypted JSON**: Encrypted with a one-time passphrase
- Password history can be included/excluded

**Import:**
- Supports LockBox exports and compatible JSON format
- Max 5 MB file size
- New entries are added (not replaced)

### 🎯 Dashboard (Home)

Shows security metrics:
- Vault summary (# entries, categories)
- Password strength distribution
- Weak/reused/compromised password count
- Last breach check date

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Focus search (from anywhere) |
| `Ctrl+N` | Open add entry modal |
| `Ctrl+L` | Lock vault immediately |
| `Escape` | Close modal / deselect entry / clear search |
| `Enter` | Quick unlock on unlock screen |

---

## Recovery & Backup

### Backup Your Data

**Option 1: Export JSON (Recommended)**
1. Go to **Settings** → **Export**
2. Choose **Plain JSON** or **Encrypted JSON**
3. For encrypted: set a strong passphrase
4. Save the file somewhere safe (external drive, cloud storage)

**Option 2: Browser Storage Backup (Web)**
1. Open DevTools (`F12`)
2. Application → LocalStorage → http://localhost:5173
3. Right-click `lockbox_vault` → Copy value
4. Paste into a secure file

**Option 3: Regular Snapshots**
- Export monthly to catch any corruption
- Keep multiple versions (v1, v2, v3, etc.)

### Recovery Scenarios

#### Scenario 1: Forgot Master Password, Have Recovery Key

**Steps:**
1. On unlock screen, click "Forgot password? Use Recovery Key"
2. Enter your 24-character recovery key
3. Click "Unlock with Recovery Key"
4. Directed to **Settings** to set a new master password
5. A new recovery key is auto-generated — **save it!**

#### Scenario 2: Forgot Master Password, Lost Recovery Key

**This is unrecoverable.** The entire vault is encrypted and inaccessible.

**Prevention:**
- Save recovery key physically (printed in safe)
- Save recovery key in separate encrypted storage
- Store in a family member's safe

#### Scenario 3: Corrupted Data

**If your vault won't unlock or is corrupted:**

1. **Web version**: 
   - Clear browser data (`Ctrl+Shift+Delete`)
   - Reimport from your export backup

2. **Desktop version**:
   - Find app data folder:
     - **macOS**: `~/Library/Application Support/LockBox/`
     - **Windows**: `%APPDATA%\LockBox\`
     - **Linux**: `~/.config/LockBox/`
   - Delete the corrupted vault file
   - Reimport from your export backup

#### Scenario 4: Lost Desktop App (Computer Broke)

1. Install LockBox on new computer
2. Click "Import" in Settings
3. Select your backup JSON
4. All entries restored

---

## Comprehensive Troubleshooting

### 🔴 App Won't Start

**Web Version Not Opening**
```bash
# Check if Node is running properly
npm run dev
# Should output: "VITE v5.0.0 ready in XXX ms"
```

**If port 5173 is in use:**
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :5173   # Windows (find PID, then taskkill)
```

**Desktop App Won't Launch**
- Ensure Node.js is installed: `node --version`
- Reinstall dependencies: `npm install`
- Try running from fresh clone in different directory

---

### 🔴 Master Password Issues

#### "Incorrect master password" on Every Try

**Causes & Fixes:**
1. **Caps Lock on** — Check keyboard state
2. **Keyboard layout changed** — Switch to correct layout (US, etc.)
3. **Special characters not typing correctly** — Try copying/pasting password from somewhere it works
4. **Browser autocomplete interfering** — Clear browser form history
5. **Corrupted vault** — Export from another device and reimport

#### Forgot Password & Recovery Key

**This is a complete loss.** Vault is cryptographically sealed.

**Prevention going forward:**
- Use a password manager (even if it's another app) to store your master password
- Print recovery key, store in safe
- Tell a trusted family member your recovery key location

---

### 🔴 Password & Data Issues

#### Password Won't Copy to Clipboard

**Causes & Fixes:**
1. **Clipboard permissions denied** (browsers):
   - Allow site to access clipboard (browser prompt)
   - Try a different browser
   - Check System Preferences → Security & Privacy

2. **Desktop app clipboard issue**:
   - Restart the app
   - Check if clipboard manager is installed (disable temporarily)

**Workaround:** Manually select, copy, paste

#### Password History Not Showing

**Expected behavior:**
- Only shows when you **edit** an entry
- Stores last 10 password changes
- Includes date changed

**If missing:**
- Entries created in v1 don't have history until first edit
- Export and reimport to rebuild

#### Text Appears Garbled in Notes

**Causes:**
1. **Special characters encoding** — Try copying to a text editor first
2. **Very long notes** (>100KB) — Break into multiple notes
3. **Non-UTF-8 encoding** — Use UTF-8 only

**Fix:**
- Delete note, recreate with cleaner text
- Test with simpler characters first

---

### 🔴 Search & Organization Issues

#### Search Finds Nothing

**Checklist:**
- [ ] Check if you're in the right filter (e.g., "2FA" filter won't show logins)
- [ ] Search is case-insensitive, but exact words matter
- [ ] Check selected category (e.g., if filtering "Work", only shows work entries)
- [ ] Typo in search query? Try partial match

**Example:**
```
Entry: "Gmail (work)" Category: "Social"

Search "gmail" ✓ Finds it
Search "work" ✓ Finds it (if Work category selected)
Search "google" ✗ Won't find (partial match only on name/tags)
```

#### Entries Disappeared After Clear Category Filter

**This is normal.** You clicked "Clear" to reset the category filter. The entries are still there.

**Restore view:**
- Click "All" under category select
- Or just click something else

#### TOTP Codes Show "------" or Error

**Causes:**
1. **Invalid Base32 secret** — Contains invalid characters (must be A-Z, 2-7)
2. **Secret not copied correctly** — Missing characters or extra spaces
3. **Corrupted entry** — Try deleting and re-adding

**Fix:**
```
Correct: JBSWY3DPEHPK3PXP
Incorrect: jbswy3dpehpk3pxp (lowercase) ✗
Incorrect: JBSWY3DPEHPK3PXPX (extra char) ✗
Incorrect: JBSWY3 DPEHPK 3PXP (spaces) ✗
```

- Get the secret again from source (Google, Microsoft, etc.)
- Paste carefully (no extra spaces)
- Use **Test Secret** to verify before saving

---

### 🔴 Performance & Freezing

#### App Is Very Slow

**Causes & Fixes:**
1. **Too many entries** (>5000):
   - Export to JSON and split into multiple vaults
   - Use filters more to reduce rendered entries

2. **Browser memory issue**:
   - Close other tabs
   - Restart browser
   - Clear cache

3. **Unresponsive password breach check**:
   - This can take 2–5 seconds on slow connections
   - The network call is rate-limited; wait between checks

#### Entry Modal Won't Open / Freezes

**Causes:**
1. **Very large entry** (massive notes) — Try editing in parts
2. **Too many tags/categories** — Simplify
3. **Browser memory exhausted** — Close other apps

**Immediate fix:**
- Press `Escape` to close modal
- Refresh page or restart app
- Clear browser cache

#### Desktop App Crashes on Launch

**Causes:**
1. **Corrupted app cache**:
   ```bash
   rm -rf node_modules
   npm install
   npm run electron:dev
   ```

2. **Electron conflict**:
   - Ensure only one instance is running
   - Check Task Manager for ghost `Electron.exe` processes
   - Kill them and restart

---

### 🔴 Sync & Backup Issues

#### Import Fails with "File Too Large"

**Solution:**
- Max file size: **5 MB**
- Break large exports into multiple smaller files
- Remove entries with massive password history

#### Imported Entries Have Duplicate Names

**This is normal** — LockBox doesn't merge duplicates (intentional safety feature).

**Fix:**
- Manually edit entries after import
- Or delete old entries first, then import

#### Export File Corrupted or Won't Import

**Troubleshooting:**
1. Open export file in text editor (not Excel/Word)
2. Check it starts with `{` and ends with `}`
3. Look for any obvious corruption (truncated text)
4. Try exporting again
5. If still broken, reimport from older backup

---

### 🔴 Desktop App Specific Issues

#### App Won't Quit Properly

**Solution:**
```bash
# Force quit on Windows
taskkill /F /IM "Electron.exe"

# Force quit on macOS
killall "LockBox"

# Force quit on Linux
pkill -9 lockbox
```

#### Can't Find App Data Folder

**Locations:**
- **macOS**: `~/Library/Application Support/LockBox/`
- **Windows**: `%APPDATA%\LockBox\` (copy this into Run dialog)
- **Linux**: `~/.config/LockBox/`

**To open in file explorer:**
```bash
# Windows
explorer %APPDATA%\LockBox

# macOS
open ~/Library/Application\ Support/LockBox/

# Linux
nautilus ~/.config/LockBox/
```

#### Updates Won't Install

**Solution:**
1. Manually delete app folder
2. Download/build latest version
3. Reinstall

---

### 🔴 Security Concerns

#### Suspect Vault Has Been Compromised

**Immediate steps:**
1. **Lock vault** (`Ctrl+L`) or close app
2. **Export to JSON** from another device (if possible)
3. **Check for unexpected entries** in export file
4. **Change master password** immediately
5. **Review password history** for suspicious changes
6. **Update all passwords** in your vault

#### Someone Knows Your Master Password

**Cannot be reversed,** but you can:
1. Change master password (Settings)
2. This auto-generates a new recovery key
3. All previous recovery keys become invalid
4. Old password can no longer unlock vault

---

### 🔴 Browser-Specific Issues

#### Safari: Clipboard Permission Denied

**Fix:**
1. Settings → Privacy → Websites → Clipboard
2. Allow `localhost:5173` or your domain
3. Try copying again

#### Firefox: Storage Quota Exceeded

**Solution:**
1. Enter `about:preferences#privacy`
2. Clear "Cookies and Site Data"
3. Run `npm run dev` again (fresh localStorage)
4. Reimport from backup

#### Chrome: Auto-fill Interfering

**Fix:**
1. Chrome settings → Autofill → Passwords
2. Turn off autofill for `localhost`
3. Or use Incognito mode for LockBox

---

## Security & Privacy

### 🔒 Encryption Details

**What's encrypted:**
- ✅ All vault entries (names, usernames, passwords, notes)
- ✅ Tags and categories
- ✅ Entry metadata (timestamps)
- ❌ NOT encrypted: vault size, approximate entry count (observable from file size)

**Encryption scheme:**
```
Master Password (your input)
    ↓
PBKDF2-SHA256 (310,000 iterations)
    ↓
256-bit AES-KW Key Encryption Key (KEK)
    ↓
Wraps a random 256-bit Data Encryption Key (DEK)
    ↓
DEK + Recovery Key: separate encryption path using same DEK wrapping scheme
    ↓
Vault encrypted with DEK using AES-256-GCM (random IV each save)
    ↓
Stored in browser localStorage or app storage
```

### 🔐 Best Practices

1. **Master Password:**
   - 16+ characters recommended
   - Mix of upper, lower, numbers, symbols
   - Don't use personal info (birthdate, pet names, etc.)
   - Don't reuse from other accounts

2. **Recovery Key:**
   - Print and store in a safe
   - Keep separate from master password
   - Only one copy per vault
   - Never digitally share or email

3. **Device Security:**
   - Keep your OS and browser updated
   - Use antivirus software
   - Don't use LockBox on public/shared computers
   - Enable disk encryption (BitLocker, FileVault)

4. **Backup:**
   - Export vault monthly
   - Store exports on encrypted external drive
   - Keep one export in a trusted cloud (encrypted)

5. **Breach Checking:**
   - Regularly check passwords via breach detector
   - Update compromised passwords immediately
   - Use the generated passwords for new entries

### 📊 Privacy Statement

- **No telemetry** — App doesn't phone home
- **No analytics** — No tracking of usage
- **No cloud sync** — All data stays on your device
- **No accounts** — No username, email, or registration required
- **Open source** — Code is auditable
- **Offline capable** — Works without internet

---

## FAQ

### General

**Q: Is LockBox safe?**
A: Yes. It uses AES-256-GCM encryption (same as military grade) with PBKDF2 key derivation. The encryption is auditable and uses industry standards. However, security depends on your master password strength and device security.

**Q: Can you recover my password if I forget it?**
A: No. By design, there's no backdoor or recovery mechanism. Only you have the key. This is intentional for security. Your Recovery Key is your only backup.

**Q: Why no cloud sync?**
A: Cloud adds attack surface and requires an account/login. Local-only storage is simpler and more secure. You can manually sync via export/import.

**Q: How often should I backup?**
A: At least monthly. More frequently if you add/change many passwords.

**Q: Can I use the same vault on multiple devices?**
A: Not automatically, but you can:
1. Export on Device A
2. Import on Device B
3. They become independent vaults

Changes on one device won't sync to the other.

### Technical

**Q: What happens if my computer crashes while saving?**
A: Zustand writes to localStorage atomically. Either the save completes or it doesn't. There's no partial state. If interrupted, the vault reverts to the last successful state.

**Q: Can I verify the code is secure?**
A: Yes! LockBox is open source. You can:
1. Read `src/utils/crypto.ts` to see the cryptography
2. Review React components for vulnerabilities
3. Build it yourself instead of using pre-built binaries
4. Submit security audit results as issues

**Q: How large can my vault be?**
A: Theoretically, localStorage supports ~5-10 MB per domain. With AES compression, you can store ~1000 entries comfortably. Desktop app has no practical limit.

**Q: Will LockBox work offline?**
A: **Web version**: Yes, after first load (cached by service worker)
**Desktop version**: Completely offline, no internet required

**Q: Can I export to Bitwarden/1Password?**
A: You'll need to manually map LockBox fields to their formats. The easiest approach:
1. Export from LockBox as JSON
2. Open in spreadsheet or JSON editor
3. Map fields to target format
4. Import to Bitwarden/1Password

### Troubleshooting

**Q: I locked myself out. What do I do?**
A: If you have your recovery key, use it on the unlock screen. If you don't have it, the vault is unrecoverable.

**Q: My vault won't decrypt. Is it corrupted?**
A: Unlikely. More common causes:
- Wrong master password (check caps lock, keyboard layout)
- Browser autocorrect on password field
- Corrupted localStorage (clear cache, reimport)

**Q: I accidentally deleted an entry. Can I undo?**
A: No undo feature (intentional, for data integrity). But if you exported recently, restore from backup and re-add new entries manually.

**Q: Can I have multiple vaults?**
A: On the same device, you can:
- Create separate browser profiles (each has own localStorage)
- Use separate user accounts (Windows/macOS)
- Keep multiple export files and swap between them

---

## Support & Reporting Issues

### Found a Bug?

1. **Check this guide** for known issues
2. **Reproduce the issue** with a fresh import
3. **Collect details**:
   - Operating system and version
   - App version (from about screen or package.json)
   - Steps to reproduce
   - Error message or screenshot
4. **Report on GitHub**: Create an issue with above details

### Security Issue?

Do NOT post publicly. Email security team or create a private GitHub security advisory.

### Need Help?

1. **Check FAQ** (above)
2. **Search troubleshooting section** for your error
3. **Check GitHub issues** for similar reports
4. **Create new issue** with detailed reproduction steps

---

## Technical Stack

| Component | Technology |
|-----------|-----------|
| UI Framework | React 18 + TypeScript |
| Styling | TailwindCSS + Tailwind UI |
| State Management | Zustand |
| Encryption | WebCrypto API (browser native) |
| 2FA Generation | WebCrypto HMAC-SHA1 (RFC 6238) |
| Storage (Web) | localStorage (encrypted) |
| Storage (Desktop) | File system (encrypted) |
| Desktop Runtime | Electron 28+ |
| Build Tool | Vite |

---

## License & Attribution

MIT License — Use, modify, and distribute freely.

- **Crypto primitives**: WebCrypto API (W3C standard, browser native)
- **Icons**: Lucide React
- **Styling**: TailwindCSS
- **State**: Zustand

---

## Changelog & Version History

### v1.0.0 (Current)

✅ **Core Features:**
- AES-256-GCM encryption
- Recovery Key system
- TOTP 2FA manager
- Password generator
- Breach detection
- Entry search/sort/filter
- Export/import (plain & encrypted)
- Auto-lock with warning
- Clipboard auto-clear
- Desktop (Electron) and web support

🔧 **Security Enhancements:**
- Rate-limited password attempts (exponential backoff)
- V1→V2 vault auto-migration
- Sanitized import validation
- 5 MB import file size guard
- Clear masterPassword from state when not needed
- Clear salt from state on lock

🎨 **Quality of Life:**
- Keyboard shortcuts (Ctrl+N, Ctrl+F, Ctrl+L, Esc)
- Password age badges
- Sort by name/date/strength
- Quick-copy on row hover
- First-run onboarding card
- Auto-lock warning toast with Snooze button

---

**Happy password managing! 🔐**

If you find this guide helpful, star the repository and share with others.

For issues, feature requests, or security reports, please visit the repository.
