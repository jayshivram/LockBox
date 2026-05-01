export type Category = 'All' | 'Personal' | 'Work' | 'Finance' | 'Crypto' | 'Social' | 'Servers' | 'API Keys' | 'Network';
export type EntryType = 'login' | 'note' | 'totp' | 'apikey' | 'wifi' | 'bank' | 'identity';
export type View = 'dashboard' | 'vault' | 'generator' | 'totp' | 'notes' | 'settings';

export interface PasswordHistoryItem {
  password: string;
  changedAt: string;
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
}

export interface VaultSettings {
  autoLockMinutes: number;
  theme: 'dark' | 'light';
  clipboardClearSeconds: number;
  requireMasterPasswordOnResume: boolean;
  biometricEnabled: boolean;
  wipeAfterAttempts: number; // 0 = disabled
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
