# 🔐 LockBox — Offline Local Password Manager

A **secure, offline-first password manager** built with React + Electron. Zero-knowledge, AES-256-GCM encrypted, local-only storage.

> 📖 **[👉 Complete User Guide & Troubleshooting →](GUIDE.md)** (Setup, usage, recovery, and comprehensive troubleshooting)

---

## Features

### 🔒 Security
- **AES-256-GCM** encryption for all vault data
- **PBKDF2-SHA256** key derivation (310,000 iterations)
- **Zero-knowledge**: your master password never leaves your device
- **Auto-lock** after configurable inactivity period
- **Clipboard auto-clear** after 15 seconds
- **Have I Been Pwned** breach detection

### 🗄️ Vault
- Store logins, secure notes, TOTP seeds, and API keys
- Password history tracking (last 10)
- Categories: Personal, Work, Finance, Crypto, Social, Servers, API Keys
- Tags and favorites
- Instant search across all fields

### 🔑 Password Generator
- Configurable length (8–64 characters)
- Uppercase, lowercase, numbers, symbols options
- Exclude ambiguous characters
- Passphrase generator (word-based)
- Password strength meter with entropy calculation

### 📱 TOTP Authenticator
- Built-in 2FA code generator (RFC 6238)
- No phone needed — replaces Google/Microsoft Authenticator
- Real-time countdown ring

### 📝 Secure Notes
- Encrypted notes for recovery codes, seed phrases, private keys
- Show/hide content with single click

### 📊 Dashboard
- Security score calculation
- Weak/reused/compromised password detection
- Category breakdown charts

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

### First Time Setup
1. Create a **strong master password** (≥8 chars, mixed case, numbers, symbols)
2. **Save your Recovery Key** (shown once — never again!)
3. Start adding entries with the **+ button** or `Ctrl+N`

⚠️ **Important**: Your master password cannot be recovered. Keep your Recovery Key somewhere safe.

---

## Installation & Setup

**Requirements:** Node.js v18+, npm v9+

### Web Installation
```bash
npm install
npm run dev
```

### Desktop Installation
```bash
npm install
npm run electron:dev
```

### Production Build
```bash
npm run build                    # Web
npm run electron:build           # Desktop apps (.exe, .dmg, .AppImage)
```

---

## Usage & Documentation

**For complete documentation, see [GUIDE.md](GUIDE.md), which covers:**

✅ **Setup**
- First-time password creation
- Saving recovery keys safely
- Vault initialization

✅ **Features**
- Adding/managing vault entries
- Password generator & strength meter
- TOTP 2FA codes
- Search, sort, and filtering
- Export/import (plain & encrypted)
- Auto-lock & clipboard auto-clear

✅ **Keyboard Shortcuts**
- `Ctrl+F` — Search
- `Ctrl+N` — New entry
- `Ctrl+L` — Lock vault
- `Esc` — Close/deselect

✅ **Recovery & Backup**
- How to backup your vault
- Using recovery keys
- Restoring from exports
- Multi-device setup

✅ **Comprehensive Troubleshooting**
- "App won't start" → Solutions
- "Forgot password" → Recovery steps
- "Password won't copy" → Clipboard fixes
- "TOTP shows ------" → Base32 validation
- "Search finds nothing" → Filtering issues
- Browser-specific issues (Safari, Firefox, Chrome)
- Desktop app issues
- Performance & freezing
- Security concerns

✅ **FAQ**
- Is LockBox safe? (Yes — AES-256-GCM, auditable code)
- No cloud sync? (By design for security)
- Offline capable? (Yes, completely)
- How often backup? (Monthly recommended)
- Multiple devices? (Manual sync via export/import)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18 + TypeScript |
| Styling | TailwindCSS |
| State | Zustand |
| Encryption | WebCrypto API (native) |
| TOTP | WebCrypto HMAC-SHA1 (RFC 6238) |
| Storage | localStorage (encrypted) |
| Desktop | Electron 28 |

---

## Security Architecture

```
Master Password
      ↓
PBKDF2-SHA256 (310,000 iterations + random salt)
      ↓
256-bit AES Key
      ↓
AES-256-GCM Encryption (random IV per save)
      ↓
Encrypted Vault (localStorage)
```

**Important**: Your master password cannot be recovered. This is by design for maximum security.

---

## Import / Export

- **Plain JSON**: Unencrypted (keep offline!)
- **Encrypted JSON**: One-time passphrase protection
- **Compatible with**: LockBox exports, manual mapping from Bitwarden/1Password/LastPass

See [GUIDE.md → Export/Import](GUIDE.md#settingsexport-import) for detailed steps.

---

## Privacy & Security

- ✅ No telemetry
- ✅ No analytics  
- ✅ No cloud sync
- ✅ No accounts required
- ✅ 100% offline capable
- ✅ Open source (auditable code)
- ✅ AES-256-GCM encryption (military grade)
- ✅ Rate-limited password attempts
- ✅ Automatic breach detection

See [GUIDE.md → Security & Privacy](GUIDE.md#security--privacy) for details.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Search vault |
| `Ctrl+N` | Add new entry |
| `Ctrl+L` | Lock immediately |
| `Esc` | Close/deselect |

For more features, see the [complete guide](GUIDE.md).

---

## Installation

```bash
npm install
npm run dev
```

Open http://localhost:5173

### Desktop (Electron)

```bash
npm install
npm run electron:dev
```

### Build for Production

```bash
npm run build                    # Web build in ./dist/
npm run electron:build           # Desktop apps
```

---

## Support & Issues

- **Bug reports**: Create a GitHub issue with reproduction steps
- **Security issues**: Do NOT post publicly — use GitHub Security Advisory
- **Help needed**: Check [GUIDE.md](GUIDE.md) first (covers 95% of issues)

---

## License

MIT — Use, modify, and distribute freely.

**Attribution:**
- Encryption: WebCrypto API (W3C standard)
- Icons: Lucide React
- Styling: TailwindCSS
- State: Zustand

---

**📖 Full documentation: [See GUIDE.md](GUIDE.md)**
