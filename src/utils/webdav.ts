/**
 * WebDAV sync for LockBox.
 *
 * Pushes / pulls the encrypted vault blob to a user-configured WebDAV endpoint.
 * The vault is stored as a single JSON file — identical to what's in localStorage.
 * Since the vault is already AES-256-GCM encrypted, the WebDAV server sees only
 * opaque ciphertext and never has access to the plaintext.
 *
 * CORS: The WebDAV server must send appropriate CORS headers. Nextcloud/Owncloud
 * do this by default when accessed from a browser. Custom WebDAV servers may need
 * to be configured (e.g., Apache + mod_headers, Caddy CORS middleware).
 */

import type { WebDAVConfig } from '../types';

/** Build the full URL for the vault file on the WebDAV server. */
function buildUrl(config: WebDAVConfig): string {
  const base = config.url.replace(/\/$/, '');
  const path = config.path.startsWith('/') ? config.path : `/${config.path}`;
  return `${base}${path}`;
}

/** Build a Basic-auth header value from username + password. Handles non-ASCII characters safely. */
function basicAuth(username: string, password: string): string {
  return `Basic ${btoa(unescape(encodeURIComponent(`${username}:${password}`)))}`;
}

/**
 * Push the current encrypted vault JSON to the WebDAV server.
 * Creates the file if it doesn't exist, overwrites if it does.
 */
export async function pushVaultToWebDAV(
  config: WebDAVConfig,
  encryptedVaultJson: string
): Promise<void> {
  const url = buildUrl(config);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.username) {
    headers['Authorization'] = basicAuth(config.username, config.password);
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: encryptedVaultJson,
    credentials: 'omit',
  });

  if (!res.ok) {
    throw new Error(`WebDAV push failed: ${res.status} ${res.statusText}`);
  }
}

/**
 * Pull the encrypted vault JSON from the WebDAV server.
 * Returns the raw JSON string (same format as localStorage vault).
 */
export async function pullVaultFromWebDAV(config: WebDAVConfig): Promise<string> {
  const url = buildUrl(config);
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  if (config.username) {
    headers['Authorization'] = basicAuth(config.username, config.password);
  }

  const res = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'omit',
  });

  if (res.status === 404) {
    throw new Error('No vault found on WebDAV server. Push first to create it.');
  }
  if (!res.ok) {
    throw new Error(`WebDAV pull failed: ${res.status} ${res.statusText}`);
  }

  return res.text();
}

/**
 * Test the WebDAV connection by attempting a PROPFIND on the root path.
 * Returns a result object so callers can handle success and failure uniformly.
 */
export async function testWebDAVConnection(
  config: WebDAVConfig
): Promise<{ success: boolean; status?: number; error?: string }> {
  const base = config.url.replace(/\/$/, '');
  const headers: Record<string, string> = {
    'Depth': '0',
  };
  if (config.username) {
    headers['Authorization'] = basicAuth(config.username, config.password);
  }

  try {
    const res = await fetch(base, {
      method: 'PROPFIND',
      headers,
      credentials: 'omit',
    });

    if (res.status === 401) return { success: false, error: 'Authentication failed. Check your username and password.' };
    if (res.status === 403) return { success: false, error: 'Permission denied. Check the WebDAV path and permissions.' };
    if (!res.ok && res.status !== 207) {
      return { success: false, error: `Connection failed: ${res.status} ${res.statusText}` };
    }
    return { success: true, status: res.status };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}
