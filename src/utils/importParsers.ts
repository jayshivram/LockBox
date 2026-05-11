/**
 * Import parsers for popular password managers.
 * Each parser converts a foreign format into a normalised ParsedImportEntry[]
 * that the vault store can sanitise and ingest.
 */

export interface ParsedImportEntry {
  type: 'login' | 'note' | 'totp' | 'apikey';
  name: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  category?: string;
  tags?: string[];
  totpSecret?: string;
}

export type ImportFormat =
  | 'lockbox'
  | 'lastpass-csv'
  | 'bitwarden-json'
  | '1password-csv'
  | 'chrome-csv'
  | 'dashlane-csv'
  | 'keepass-csv'
  | 'generic-csv';

// ─── Format detector ─────────────────────────────────────────────────────────

/**
 * Detect the likely format of an import file based on its content and filename.
 * Returns 'lockbox' if the file is a LockBox export (handled by existing logic).
 */
export function detectImportFormat(content: string, filename: string): ImportFormat {
  const lower = filename.toLowerCase();

  // LockBox native export
  try {
    const parsed = JSON.parse(content);
    if (parsed?.entries && Array.isArray(parsed.entries)) return 'lockbox';
    if (Array.isArray(parsed) && parsed[0]?.type && parsed[0]?.name) return 'lockbox';
    // Bitwarden JSON export
    if (parsed?.encrypted === false && Array.isArray(parsed?.items)) return 'bitwarden-json';
    if (Array.isArray(parsed?.items) && parsed?.items?.[0]?.login !== undefined) return 'bitwarden-json';
  } catch {
    // Not JSON — try CSV
  }

  const firstLine = content.split('\n')[0]?.toLowerCase() ?? '';

  // LastPass CSV: url,username,password,totp,extra,name,grouping,fav
  if (firstLine.includes('grouping') && firstLine.includes('totp')) return 'lastpass-csv';

  // Chrome CSV: name,url,username,password
  if (firstLine === 'name,url,username,password') return 'chrome-csv';

  // 1Password CSV: Title,Username,Password,URL,OTPAuth
  if (firstLine.includes('otpauth') && firstLine.includes('title')) return '1password-csv';

  // Dashlane CSV: Title,URL,Login,Password,Note,Category,...
  if (firstLine.includes('login') && firstLine.includes('category') && firstLine.includes('note')) return 'dashlane-csv';

  // KeePass CSV: Account,Login Name,Password,Web Site,Comments
  if (firstLine.includes('login name') || (lower.includes('keepass') && firstLine.includes('account'))) return 'keepass-csv';

  if (lower.endsWith('.csv')) return 'generic-csv';

  return 'lockbox'; // fallback — let existing logic handle it
}

// ─── CSV parsing helper ───────────────────────────────────────────────────────

/** Parse a CSV string into an array of header→value objects. */
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (cells[idx] ?? '').trim(); });
    rows.push(row);
  }
  return rows;
}

/** Split a single CSV line respecting quoted fields. */
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/** Extract a TOTP secret from an otpauth:// URI if present */
function extractTOTPSecret(otpauth: string): string {
  try {
    const url = new URL(otpauth.trim());
    return url.searchParams.get('secret') ?? '';
  } catch {
    return '';
  }
}

// ─── LastPass CSV ─────────────────────────────────────────────────────────────
// Format: url,username,password,totp,extra,name,grouping,fav

export function parseLastPassCSV(content: string): ParsedImportEntry[] {
  const rows = parseCSV(content);
  return rows
    .filter(r => r['name'] || r['url'])
    .map(r => {
      const totpRaw = r['totp'] ?? '';
      const totpSecret = totpRaw.startsWith('otpauth://') ? extractTOTPSecret(totpRaw) : totpRaw;
      const isNote = (r['url'] ?? '').toLowerCase() === 'http://sn' || !(r['url'] ?? '').trim();
      return {
        type: isNote ? 'note' : 'login',
        name: r['name'] || r['url'] || 'Imported Entry',
        username: r['username'] ?? '',
        password: r['password'] ?? '',
        url: isNote ? '' : (r['url'] ?? ''),
        notes: r['extra'] ?? '',
        category: r['grouping'] ?? '',
        totpSecret: totpSecret || undefined,
      } satisfies ParsedImportEntry;
    });
}

// ─── Bitwarden JSON ───────────────────────────────────────────────────────────
// Format: { encrypted: false, items: [{type, name, login: {username, password, uris, totp}, notes, ...}] }

export function parseBitwardenJSON(content: string): ParsedImportEntry[] {
  const data = JSON.parse(content);
  const items: unknown[] = data?.items ?? (Array.isArray(data) ? data : []);

  return items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => {
      const type = Number(item['type']);  // 1=login, 2=secure note, 3=card, 4=identity
      const login = (item['login'] ?? {}) as Record<string, unknown>;
      const uris = Array.isArray(login['uris']) ? (login['uris'] as Array<Record<string, string>>) : [];
      const url = uris[0]?.uri ?? '';
      const totpRaw = String(login['totp'] ?? '');
      const totpSecret = totpRaw.startsWith('otpauth://') ? extractTOTPSecret(totpRaw) : totpRaw;
      const fields = Array.isArray(item['fields'])
        ? (item['fields'] as Array<Record<string, unknown>>)
            .map(f => `${f['name']}: ${f['value']}`)
            .join('\n')
        : '';
      const notes = [String(item['notes'] ?? ''), fields].filter(Boolean).join('\n\n');

      return {
        type: type === 2 ? 'note' : 'login',
        name: String(item['name'] ?? 'Imported Entry'),
        username: String(login['username'] ?? ''),
        password: String(login['password'] ?? ''),
        url,
        notes,
        totpSecret: totpSecret || undefined,
      } satisfies ParsedImportEntry;
    });
}

// ─── 1Password CSV ────────────────────────────────────────────────────────────
// Format: Title,Username,Password,URL,OTPAuth,Notes,Type,...

export function parse1PasswordCSV(content: string): ParsedImportEntry[] {
  const rows = parseCSV(content);
  return rows
    .filter(r => r['title'] || r['url'])
    .map(r => {
      const otpRaw = r['otpauth'] ?? r['otp auth'] ?? r['one-time password'] ?? '';
      const totpSecret = otpRaw.startsWith('otpauth://') ? extractTOTPSecret(otpRaw) : otpRaw;
      return {
        type: 'login',
        name: r['title'] || r['url'] || 'Imported Entry',
        username: r['username'] ?? '',
        password: r['password'] ?? '',
        url: r['url'] ?? '',
        notes: r['notes'] ?? r['memo'] ?? '',
        totpSecret: totpSecret || undefined,
      } satisfies ParsedImportEntry;
    });
}

// ─── Chrome / Edge CSV ────────────────────────────────────────────────────────
// Format: name,url,username,password

export function parseChromeCSV(content: string): ParsedImportEntry[] {
  const rows = parseCSV(content);
  return rows
    .filter(r => r['url'] || r['name'])
    .map(r => ({
      type: 'login',
      name: r['name'] || r['url'] || 'Imported Entry',
      username: r['username'] ?? '',
      password: r['password'] ?? '',
      url: r['url'] ?? '',
    } satisfies ParsedImportEntry));
}

// ─── Dashlane CSV ─────────────────────────────────────────────────────────────
// Format: Title,URL,Login,Password,Note,Category,...

export function parseDashlaneCSV(content: string): ParsedImportEntry[] {
  const rows = parseCSV(content);
  return rows
    .filter(r => r['title'] || r['url'])
    .map(r => ({
      type: 'login',
      name: r['title'] || r['url'] || 'Imported Entry',
      username: r['login'] ?? r['username'] ?? r['email'] ?? '',
      password: r['password'] ?? '',
      url: r['url'] ?? '',
      notes: r['note'] ?? r['notes'] ?? '',
      category: r['category'] ?? '',
    } satisfies ParsedImportEntry));
}

// ─── KeePass CSV ──────────────────────────────────────────────────────────────
// Format: Account,Login Name,Password,Web Site,Comments

export function parseKeePassCSV(content: string): ParsedImportEntry[] {
  const rows = parseCSV(content);
  return rows
    .filter(r => r['account'] || r['web site'])
    .map(r => ({
      type: 'login',
      name: r['account'] || r['web site'] || 'Imported Entry',
      username: r['login name'] ?? r['username'] ?? '',
      password: r['password'] ?? '',
      url: r['web site'] ?? '',
      notes: r['comments'] ?? r['notes'] ?? '',
    } satisfies ParsedImportEntry));
}

// ─── Generic CSV ──────────────────────────────────────────────────────────────
// Best-effort mapping for unknown CSV formats

export function parseGenericCSV(content: string): ParsedImportEntry[] {
  const rows = parseCSV(content);
  if (!rows.length) return [];

  // Try to map common header aliases
  const alias = (row: Record<string, string>, ...keys: string[]): string => {
    for (const k of keys) {
      const v = row[k] ?? row[k.replace(/[\s_-]/g, '')] ?? '';
      if (v) return v;
    }
    return '';
  };

  return rows.map(r => ({
    type: 'login',
    name: alias(r, 'name', 'title', 'site', 'service', 'account') || 'Imported Entry',
    username: alias(r, 'username', 'user', 'email', 'login', 'user name'),
    password: alias(r, 'password', 'pass', 'passwd'),
    url: alias(r, 'url', 'website', 'site', 'web site', 'uri'),
    notes: alias(r, 'notes', 'note', 'comments', 'memo'),
  } satisfies ParsedImportEntry));
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

export function parseImportFile(
  content: string,
  format: ImportFormat
): ParsedImportEntry[] {
  switch (format) {
    case 'lastpass-csv':    return parseLastPassCSV(content);
    case 'bitwarden-json':  return parseBitwardenJSON(content);
    case '1password-csv':   return parse1PasswordCSV(content);
    case 'chrome-csv':      return parseChromeCSV(content);
    case 'dashlane-csv':    return parseDashlaneCSV(content);
    case 'keepass-csv':     return parseKeePassCSV(content);
    case 'generic-csv':     return parseGenericCSV(content);
    default:                return [];
  }
}
