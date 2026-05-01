# LockBox — Recovery Key, QoL & Deep Audit

## Overview
Three work streams in one pass: a cryptographically sound password-recovery system, daily-use quality-of-life improvements, and seven additional security/logic bugs found in a deep code audit.

---

## Part 1 — Forgotten Master Password (Recovery Key)

### Design
Because LockBox uses zero-knowledge AES-256-GCM encryption, it is **mathematically impossible** to recover a vault without the key. The only honest solution that doesn't weaken security is to give you a **second key** at setup time that you write down and keep safe.

This uses **Data Encryption Key (DEK) wrapping** — the same pattern used by 1Password and Bitwarden:

```
Setup time:
  1. Generate a random 256-bit DEK  (the actual vault encryption key)
  2. Derive KEK-password  = PBKDF2(masterPassword, saltPw)
  3. Derive KEK-recovery  = PBKDF2(recoveryKey,    saltRec)
  4. Wrap DEK with KEK-password  → wrappedDEK_pw   (AES-KW)
  5. Wrap DEK with KEK-recovery  → wrappedDEK_rec  (AES-KW)
  6. Encrypt vault with DEK
  7. Store: { encryptedVault, wrappedDEK_pw, saltPw, wrappedDEK_rec, saltRec }

Unlock with password:
  Derive KEK-password → unwrap wrappedDEK_pw → DEK → decrypt vault

Unlock with recovery key:
  Derive KEK-recovery → unwrap wrappedDEK_rec → DEK → decrypt vault
```

The recovery key is a **24-character uppercase alphanumeric** code displayed as 6 groups of 4 (`XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`). This gives 119-bit entropy — stronger than most master passwords.

> [!IMPORTANT]
> Existing vaults use the old single-key format. The app will detect the format version and migrate transparently on the next successful unlock (re-wrapping the vault under the new DEK scheme). A "Recovery Key" section will appear in Settings for existing users.

> [!WARNING]
> The recovery key is shown **once** during setup. If the user loses both their master password AND their recovery key, the vault cannot be recovered. This is by design — the alternative would be a backdoor.

### Also Added: Password Hint
A plain-text optional hint stored unencrypted alongside the vault. Shown on the unlock screen. Never stores the actual password — only a reminder.

---

## Part 2 — Quality of Life Improvements

| # | Feature | Where |
|---|---------|-------|
| 1 | **Password hint** — set at setup, shown on unlock | SetupScreen, UnlockScreen, Settings |
| 2 | **Auto-lock countdown warning** — amber toast 30s before lock fires, with Snooze button | Layout |
| 3 | **Keyboard shortcuts** — `Ctrl+F` focus search, `Escape` close modal/deselect, `Ctrl+N` new entry, `Ctrl+L` lock | Layout, VaultList |
| 4 | **Sort controls** in VaultList — A–Z / Z–A / Newest / Oldest / Strength | VaultList |
| 5 | **Password age badge** — "Updated 3 days ago" on entry detail panel | VaultList |
| 6 | **Auto-lock timer restart** when `autoLockMinutes` changes in Settings | Settings / vaultStore |
| 7 | **Import size guard** — reject import files > 5 MB to prevent memory DoS | vaultStore |
| 8 | **Encrypted export option** — export vault JSON encrypted with a one-time passphrase | Settings, crypto |
| 9 | **Copy-on-click for username/SSID fields** (quick row-level copy) | VaultList row |
| 10 | **"Change Master Password" in Settings** — re-encrypts vault under new password | Settings, vaultStore, crypto |
| 11 | **First-run onboarding tip** — when vault is empty, show a quick 3-step card | VaultList |
| 12 | **Quick unlock with Enter key on unlock screen** — already present but add autofocus on error | UnlockScreen (already partial, improve) |

---

## Part 3 — Deep Audit Findings

### Security Issues

| Sev | Issue | Location | Fix |
|-----|-------|----------|-----|
| **HIGH** | `deriveKey` makes a **non-extractable** AES-GCM key — this makes DEK wrapping impossible without a refactor | `crypto.ts:39–50` | New DEK architecture resolves this; the DEK is a raw key, wrapped keys are AES-KW |
| **HIGH** | **No unlock rate-limiting** — unlimited password attempts allowed; brute-force through UI is trivial | `UnlockScreen.tsx` + `vaultStore.ts` | Exponential backoff: 1s, 2s, 4s, 8s… up to 30s after 5+ failures; lockout counter persists in state |
| **MEDIUM** | `masterPassword` **persists in Zustand state** in plaintext after unlock — visible in React DevTools | `vaultStore.ts:125` | Clear `masterPassword` from state immediately after key derivation UNLESS `requireMasterPasswordOnResume` is true (needed for re-auth) |
| **MEDIUM** | `deleteVault()` in Settings does **not wipe** the legacy `SALT_KEY` from localStorage if it was ever set by an old version | `crypto.ts:92–95` | Already correct — `deleteVault` removes both. No action needed. |
| **MEDIUM** | **TOTP secret validation absent** — entering a non-Base32 string crashes `base32Decode` silently, shows `------` forever with no user feedback | `totp.ts:3–19` + `TOTPManager.tsx` | Add Base32 validation and show an inline error instead of phantom `------` |
| **LOW** | `base32Decode` is **vulnerable to invalid chars** — `alphabet.indexOf(str[i])` returns `-1` for unknown chars, corrupting the decoded bytes silently | `totp.ts:12` | Throw on invalid char; surface to user |
| **LOW** | `updateSettings` doesn't **restart the lock timer** when `autoLockMinutes` changes | `vaultStore.ts` | After saving settings, call `resetActivity()` to restart timer with new duration |

### Logic Bugs

| # | Bug | Location | Fix |
|---|-----|----------|-----|
| 1 | `exportVault` exports `passwordHistory` including previously deleted passwords in plaintext | `vaultStore.ts:234–237` | Strip `passwordHistory` from export OR add a clear warning; add option to exclude it |
| 2 | `generatePassphrase` uses `numValues[0] % 9999` which never produces `9999` — range is `[0, 9998]` | `generator.ts` | Already fixed in previous pass (now uses `secureRandomInt(10000)`) |
| 3 | `clipboardClearSeconds` setting change takes effect only on next copy, not immediately if a copy is in-flight | minor UX bug — acceptable |
| 4 | `lock()` does not clear `salt` from Zustand state — salt is not secret but leaving it in state is unnecessary | `vaultStore.ts:141–156` | Clear `salt: null` in lock action |

---

## Files Changed

### Core Crypto & Store
#### [MODIFY] `src/utils/crypto.ts`
- New DEK key-wrapping architecture (`generateDEK`, `wrapKey`, `unwrapKey`, `deriveKEK`)
- `encryptedExport` function for passphrase-encrypted export
- Update `EncryptedVault` type in `types/index.ts` to v2 format

#### [MODIFY] `src/store/vaultStore.ts`
- New `setup()` flow using DEK wrapping + recovery key generation
- New `unlock()` flow: try password first, provide `unlockWithRecovery(key)`
- `changeMasterPassword()` action
- Rate-limited `unlock()` with exponential backoff
- Clear `masterPassword` from state when not needed
- `resetActivity()` called after settings change
- Import size limit (5 MB)
- Clear `salt` on lock

#### [MODIFY] `src/types/index.ts`
- `EncryptedVault` v2 with `wrappedDEK_pw`, `wrappedDEK_rec`, `saltRec`, `hint`, `vaultVersion`

### Components
#### [MODIFY] `src/components/SetupScreen.tsx`
- Add hint field
- Show recovery key in a modal after vault is created (must acknowledge)

#### [MODIFY] `src/components/UnlockScreen.tsx`
- Show password hint
- "Use Recovery Key" toggle
- Exponential backoff countdown display

#### [MODIFY] `src/components/Settings.tsx`
- Change master password section
- Show/copy recovery key
- Export: add encrypted export option

#### [MODIFY] `src/components/VaultList.tsx`
- Sort controls
- Password age badge
- Quick copy on row
- Keyboard shortcuts wired up
- First-run onboarding card

#### [MODIFY] `src/components/Layout.tsx`
- Auto-lock countdown warning toast
- Global keyboard shortcut handler

#### [MODIFY] `src/utils/totp.ts`
- Base32 validation with clear error thrown

---

## Verification Plan
- `npm run build` — zero TypeScript errors
- Create a new vault, write down recovery key, lock, attempt unlock with recovery key
- Enter wrong password 5 times, verify exponential backoff
- Change master password, re-lock, re-unlock with new password
- Import a malformed 10 MB JSON — verify size rejection
- TOTP: enter invalid Base32, verify error message
