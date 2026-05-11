/**
 * LockBox Autofill — Background Service Worker (MV3)
 *
 * Storage layout (chrome.storage.local):
 *   lockbox_entries  : VaultEntry[]   — synced credential list
 *   lockbox_synced_at: string         — ISO timestamp of last sync
 *   lockbox_token    : string         — one-time token expected from LockBox app
 */

const STORAGE_ENTRIES_KEY   = 'lockbox_entries';
const STORAGE_SYNCED_KEY    = 'lockbox_synced_at';
const STORAGE_TOKEN_KEY     = 'lockbox_token';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract registrable domain (e.g. "github.com") from a URL string. */
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Score how well an entry matches a given domain. Higher is better. */
function matchScore(entry, domain) {
  const entryDomain = extractDomain(entry.url || '');
  if (!entryDomain) return 0;
  if (entryDomain === domain) return 3;          // exact
  if (domain.endsWith('.' + entryDomain)) return 2; // parent domain
  if (entryDomain.endsWith('.' + domain)) return 1; // sub domain
  return 0;
}

/** Generate a cryptographically random token (hex string). */
function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Message Handler ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {

      // The LockBox app pushes entries here after the user clicks "Sync to Extension"
      case 'LOCKBOX_SYNC': {
        const storedToken = (await chrome.storage.local.get(STORAGE_TOKEN_KEY))[STORAGE_TOKEN_KEY];
        // Token validation: always require a valid token — reject if none is stored or token doesn't match
        if (!storedToken || message.token !== storedToken) {
          sendResponse({ success: false, error: 'Invalid sync token' });
          break;
        }
        if (!Array.isArray(message.entries)) {
          sendResponse({ success: false, error: 'No entries array provided' });
          break;
        }
        // Sanitize entries — only keep safe fields
        const safe = message.entries.map(e => ({
          id: String(e.id || ''),
          name: String(e.name || ''),
          username: String(e.username || ''),
          password: String(e.password || ''),
          url: String(e.url || ''),
          type: String(e.type || 'login'),
          totpSecret: e.totpSecret ? String(e.totpSecret) : undefined,
        }));
        await chrome.storage.local.set({
          [STORAGE_ENTRIES_KEY]:  safe,
          [STORAGE_SYNCED_KEY]:   new Date().toISOString(),
          // Token is kept persistent — not consumed — so repeated syncs work without regenerating
        });
        sendResponse({ success: true, count: safe.length });
        break;
      }

      // Content script requests credentials matching the current tab's URL
      case 'GET_CREDENTIALS': {
        const { url } = message;
        if (!url) { sendResponse({ entries: [] }); break; }
        const domain = extractDomain(url);
        const stored = (await chrome.storage.local.get(STORAGE_ENTRIES_KEY))[STORAGE_ENTRIES_KEY] || [];
        const matches = stored
          .filter(e => matchScore(e, domain) > 0)
          .sort((a, b) => matchScore(b, domain) - matchScore(a, domain));
        sendResponse({ entries: matches });
        break;
      }

      // Popup requests credentials for the active tab's domain
      case 'GET_CREDENTIALS_FOR_TAB': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const domain = tab?.url ? extractDomain(tab.url) : '';
        const stored = (await chrome.storage.local.get(STORAGE_ENTRIES_KEY))[STORAGE_ENTRIES_KEY] || [];
        const matches = stored
          .filter(e => matchScore(e, domain) > 0)
          .sort((a, b) => matchScore(b, domain) - matchScore(a, domain));
        const syncedAt = (await chrome.storage.local.get(STORAGE_SYNCED_KEY))[STORAGE_SYNCED_KEY] || null;
        sendResponse({ entries: matches, domain, syncedAt });
        break;
      }

      // Generate a new one-time sync token (called from popup)
      case 'GENERATE_TOKEN': {
        const token = generateToken();
        await chrome.storage.local.set({ [STORAGE_TOKEN_KEY]: token });
        sendResponse({ token });
        break;
      }

      // Clears all stored credentials (lock)
      case 'CLEAR': {
        await chrome.storage.local.remove([STORAGE_ENTRIES_KEY, STORAGE_SYNCED_KEY, STORAGE_TOKEN_KEY]);
        sendResponse({ success: true });
        break;
      }

      // Ping — allows LockBox app to detect if extension is installed
      case 'PING': {
        sendResponse({ pong: true, extensionId: chrome.runtime.id });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true; // keep sendResponse channel open for async handlers
});

// Expose extension ID to page via a window message relay so LockBox app can detect it
chrome.runtime.onInstalled.addListener(() => {
  console.log('[LockBox] Extension installed, version', chrome.runtime.getManifest().version);
});
