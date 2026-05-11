export type Category = 'All' | 'Personal' | 'Work' | 'Finance' | 'Crypto' | 'Social' | 'Servers' | 'API Keys' | 'Network';
export type EntryType = 'login' | 'note' | 'totp' | 'apikey' | 'wifi' | 'bank' | 'identity' | 'passkey' | 'custom';
export type View = 'dashboard' | 'vault' | 'generator' | 'totp' | 'notes' | 'settings';

export interface PasswordHistoryItem {
  password: string;
  changedAt: string;
}

/** A single user-defined field on a custom entry */
export interface CustomField {
  id: string;
  label: string;
  value: string;
  /** 'password' fields are hidden by default; 'totp' shows a live TOTP code */
  type: 'text' | 'password' | 'url' | 'textarea' | 'totp';
}

/** Metadata for a file attached to a vault entry.
 *  The encrypted file data is stored separately in IndexedDB (see attachmentDb). */
export interface VaultAttachment {
  id: string;
  name: string;        // original filename
  mimeType: string;    // e.g. "image/jpeg", "application/pdf"
  size: number;        // original file size in bytes
  createdAt: string;
}

/** Definition of a single field in a custom entry template */
export interface CustomFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'textarea' | 'totp';
  placeholder?: string;
  required?: boolean;
}

/** A user-defined entry template (e.g. "Medical Insurance", "Loyalty Card") */
export interface CustomEntryTemplate {
  id: string;
  name: string;
  icon: string;          // emoji icon
  defaultCategory: Category;
  fields: CustomFieldDefinition[];
  createdAt: string;
  updatedAt: string;
}

/** WebDAV sync configuration stored inside VaultSettings */
export interface WebDAVConfig {
  url: string;           // WebDAV endpoint base URL (e.g. https://cloud.example.com/remote.php/dav/files/user)
  username: string;
  password: string;      // stored encrypted inside the vault
  path: string;          // file path on the server (e.g. /lockbox/vault.json)
  autoSync: boolean;     // sync automatically on unlock/lock
  lastSyncAt?: string;   // ISO timestamp of last successful sync
}

export interface VaultEntry {
  id: string;
  type: EntryType;
  name: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  tags: string[];
  category: Category;
  totpSecret?: string;
  apiKey?: string;
  apiKeyName?: string;
  adminPassword?: string;
  wifiSsid?: string;
  passwordHistory?: PasswordHistoryItem[];
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  isCompromised?: boolean;
  lastBreachCheck?: string;
  lastUsedAt?: string;
  // Bank / financial fields
  bankName?: string;
  accountType?: string;
  accountNumber?: string;
  routingNumber?: string;
  iban?: string;
  swiftBic?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  cardholderName?: string;
  cardPin?: string;
  // Identity / document fields
  idType?: string;
  idNumber?: string;
  fullName?: string;
  dateOfBirth?: string;
  nationality?: string;
  issuingCountry?: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;
  address?: string;
  // Passkey / FIDO2 fields
  passkeyRpId?: string;           // relying party domain (e.g. "github.com")
  passkeyCredentialId?: string;   // base64url credential ID
  passkeyUsername?: string;       // username used when registering passkey
  passkeyDisplayName?: string;    // human-readable display name
  passkeyPublicKey?: string;      // base64url public key (reference only)
  passkeyAlgorithm?: string;      // e.g. "ES256", "RS256"
  passkeyBackedUp?: boolean;      // whether synced by a platform passkey manager
  // Custom entry fields
  customTypeId?: string;          // references a CustomEntryTemplate.id
  customFields?: CustomField[];   // dynamic user-defined fields
  // File attachments (metadata only; encrypted data in IndexedDB)
  attachments?: VaultAttachment[];
}

export interface VaultSettings {
  autoLockMinutes: number;
  theme: 'dark' | 'light';
  clipboardClearSeconds: number;
  requireMasterPasswordOnResume: boolean;
  biometricEnabled: boolean;
  wipeAfterAttempts: number; // 0 = disabled
  requireBiometricForVaultTab: boolean; // gate vault tab with biometric on native
  passwordAgeDays: number; // warn when password older than N days (0 = off)
  backgroundGracePeriodSeconds: number; // stay unlocked when briefly switching apps (0 = immediate)
  webdav?: WebDAVConfig; // optional WebDAV sync configuration
}

/**
 * v1: Direct PBKDF2 → AES-GCM (no DEK wrapping, no recovery key).
 * v2: Random DEK encrypted with two KEKs — one from master password, one from
 *     recovery key. Either path unlocks the same DEK which decrypts the vault.
 */
export interface EncryptedVault {
  // Present in both v1 and v2
  salt: string;        // base64: password-KEK salt (v2) or encryption salt (v1)
  iv: string;          // base64: AES-GCM nonce for vault ciphertext
  ciphertext: string;  // base64: AES-GCM encrypted vault JSON
  version: string;     // data schema version e.g. '1.0.0'
  createdAt: string;
  // v2 additions — absent in v1 vaults
  vaultVersion?: 2;
  wrappedDEK_pw?: string;   // base64: DEK wrapped with password-derived KEK (AES-KW)
  wrappedDEK_rec?: string;  // base64: DEK wrapped with recovery-key-derived KEK (AES-KW)
  saltRec?: string;          // base64: salt used to derive the recovery KEK
  hint?: string;             // plaintext (NEVER the password itself) — shown on lock screen
}

export interface VaultData {
  entries: VaultEntry[];
  settings: VaultSettings;
  version: string;
  customTemplates?: CustomEntryTemplate[];
}

export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  entropy: number;
  feedback: string[];
  color: string;
}

export interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export interface TOTPEntry {
  id: string;
  name: string;
  secret: string;
  issuer?: string;
}
