import type { GeneratorOptions } from '../types';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = /[0OIl1]/g;

const WORDLIST = [
  'apple','bridge','castle','dragon','eagle','forest','garden','harbor',
  'island','jungle','knight','lantern','meadow','nebula','ocean','palace',
  'quartz','river','silver','thunder','umbrella','violet','walnut','xenon',
  'yellow','zenith','anchor','blaze','crystal','dawn','eclipse','falcon',
  'glacier','horizon','ivory','jasper','kelp','lunar','marble','neon',
  'orbit','phantom','quill','raven','storm','titan','ultra','vortex',
  'willow','xray','yarn','zephyr','amber','bronze','coral','drift',
  'ember','flux','grove','helix','indigo','jade','karma','lava',
  'mist','nova','opal','pine','quest','rust','sage','tide','umber',
];

/**
 * Returns a cryptographically secure, unbiased random integer in [0, max).
 * Uses rejection sampling to eliminate modulo bias: values that would
 * produce a skewed distribution are discarded and re-sampled.
 *
 * @param max — exclusive upper bound (must be > 0 and <= 2^32 - 1)
 */
function secureRandomInt(max: number): number {
  if (max <= 0 || max > 0xFFFFFFFF) throw new RangeError('max must be in (0, 2^32)');
  const buf = new Uint32Array(1);
  // Use the literal 4294967296 (2^32) to avoid >>> 0 overflow when computing the
  // rejection threshold.  When remainder === 0, every Uint32 value maps evenly to
  // [0, max) — no bias, no rejection sampling needed (handles powers-of-two
  // charsets like the 8-char digit pool after removing ambiguous chars).
  const remainder = 4294967296 % max;
  if (remainder === 0) {
    crypto.getRandomValues(buf);
    return buf[0] % max;
  }
  // Reject values >= threshold so that the accepted range is a multiple of max,
  // eliminating modulo bias for all other charset sizes.
  const threshold = 4294967296 - remainder;
  while (true) {
    crypto.getRandomValues(buf);
    if (buf[0] < threshold) return buf[0] % max;
  }
}

export function generatePassword(options: GeneratorOptions): string {
  let charset = '';
  const required: string[] = [];

  // Build charset and guarantee at least one char from every required set.
  // IMPORTANT: use secureRandomInt — not Math.random().
  if (options.uppercase) {
    let pool = UPPERCASE;
    if (options.excludeAmbiguous) pool = pool.replace(AMBIGUOUS, '');
    if (pool.length > 0) {
      charset += pool;
      required.push(pool[secureRandomInt(pool.length)]);
    }
  }
  if (options.lowercase) {
    let pool = LOWERCASE;
    if (options.excludeAmbiguous) pool = pool.replace(AMBIGUOUS, '');
    if (pool.length > 0) {
      charset += pool;
      required.push(pool[secureRandomInt(pool.length)]);
    }
  }
  if (options.numbers) {
    let pool = NUMBERS;
    if (options.excludeAmbiguous) pool = pool.replace(AMBIGUOUS, '');
    if (pool.length > 0) {
      charset += pool;
      required.push(pool[secureRandomInt(pool.length)]);
    }
  }
  if (options.symbols) {
    const pool = SYMBOLS; // symbols have no ambiguous characters
    charset += pool;
    required.push(pool[secureRandomInt(pool.length)]);
  }

  if (!charset) charset = LOWERCASE + NUMBERS;

  // Fill remaining positions from the full charset using unbiased selection.
  const remaining = Math.max(0, options.length - required.length);
  const extra: string[] = [];
  for (let i = 0; i < remaining; i++) {
    extra.push(charset[secureRandomInt(charset.length)]);
  }

  // Combine required + extra, then shuffle with Fisher-Yates using unbiased indices.
  const arr = [...required, ...extra];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr.join('');
}

export function generatePassphrase(wordCount = 4, separator = '-'): string {
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(WORDLIST[secureRandomInt(WORDLIST.length)]);
  }
  // Append a zero-padded number in [0, 9999] (inclusive, 10000 values) — unbiased.
  words.push(String(secureRandomInt(10000)).padStart(4, '0'));
  return words.join(separator);
}

export function generateId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
