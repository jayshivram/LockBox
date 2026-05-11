/**
 * Attachment storage via IndexedDB.
 *
 * Vault entries only store attachment metadata (id, name, mimeType, size).
 * The actual file data is stored here — encrypted with AES-256-GCM using the
 * same DEK as the vault — so it's protected at rest and never hits localStorage.
 *
 * Max attachment size: 10 MB per file.
 * Max total attachments per vault: no hard limit (IndexedDB can hold GBs).
 */

const DB_NAME    = 'lockbox_attachments';
const DB_VERSION = 1;
const STORE_NAME = 'attachments';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

interface StoredAttachment {
  id: string;       // VaultAttachment.id
  data: ArrayBuffer; // encrypted file bytes (AES-GCM ciphertext)
  iv: string;       // base64-encoded 12-byte AES-GCM IV
}

// ─── DB initialisation ────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode
): IDBObjectStore {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  bytes.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s);
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Encrypt a File using the vault DEK and store the ciphertext in IndexedDB.
 * @param id        Attachment ID (from VaultAttachment.id)
 * @param file      The File object selected by the user
 * @param dek       The vault Data Encryption Key (AES-GCM CryptoKey)
 */
export async function saveAttachment(
  id: string,
  file: File,
  dek: CryptoKey
): Promise<void> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`File too large: max ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB`);
  }
  const rawBuffer = await file.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    dek,
    rawBuffer
  );
  const record: StoredAttachment = {
    id,
    data: encrypted,
    iv: bufferToBase64(iv.buffer),
  };
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const req = tx(db, 'readwrite').put(record);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Decrypt and return a stored attachment as a Blob.
 * @param id  Attachment ID
 * @param dek The vault DEK
 */
export async function loadAttachment(
  id: string,
  dek: CryptoKey
): Promise<{ blob: Blob; mimeType: string } | null> {
  const db = await openDB();
  const record = await new Promise<StoredAttachment | undefined>((resolve, reject) => {
    const req = tx(db, 'readonly').get(id);
    req.onsuccess = () => resolve(req.result as StoredAttachment | undefined);
    req.onerror   = () => reject(req.error);
  });
  if (!record) return null;

  const iv = new Uint8Array(base64ToBuffer(record.iv));
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    dek,
    record.data
  );
  // mimeType sniff from the first bytes (magic bytes)
  const bytes = new Uint8Array(plaintext.slice(0, 4));
  const magic = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  let mimeType = 'application/octet-stream';
  if (magic.startsWith('ffd8ff')) mimeType = 'image/jpeg';
  else if (magic.startsWith('89504e47')) mimeType = 'image/png';
  else if (magic.startsWith('25504446')) mimeType = 'application/pdf';
  else if (magic.startsWith('504b0304')) mimeType = 'application/zip';

  return { blob: new Blob([plaintext], { type: mimeType }), mimeType };
}

/**
 * Delete a single attachment from IndexedDB.
 */
export async function deleteAttachment(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const req = tx(db, 'readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Delete all attachments for the given list of IDs.
 * Called when an entry is deleted or the vault is wiped.
 */
export async function deleteAttachments(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await openDB();
  const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
  await Promise.all(ids.map(id => new Promise<void>((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  })));
}

/**
 * Wipe the entire attachment database (called when vault is deleted).
 */
export async function clearAllAttachments(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const req = tx(db, 'readwrite').clear();
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}
