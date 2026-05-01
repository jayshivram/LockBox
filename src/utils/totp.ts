// TOTP implementation using WebCrypto (RFC 6238)

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Validate and decode a Base32-encoded TOTP secret.
 * Throws a descriptive error on invalid input rather than silently producing
 * garbage bytes (which would cause a cryptic "------" code in the UI).
 */
function base32Decode(input: string): Uint8Array<ArrayBuffer> {
  const str = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  if (!str) throw new Error('TOTP secret is empty');

  for (const ch of str) {
    if (!BASE32_ALPHABET.includes(ch)) {
      throw new Error(`Invalid Base32 character: "${ch}". TOTP secrets use A–Z and 2–7 only.`);
    }
  }

  let bits = 0;
  let value = 0;
  let output = 0;
  const result = new Uint8Array(new ArrayBuffer(Math.floor((str.length * 5) / 8)));

  for (let i = 0; i < str.length; i++) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(str[i]);
    bits += 5;
    if (bits >= 8) {
      result[output++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return result;
}

function intToBytes(num: number): Uint8Array<ArrayBuffer> {
  const arr = new Uint8Array(new ArrayBuffer(8));
  let tmp = num;
  for (let i = 7; i >= 0; i--) {
    arr[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }
  return arr;
}

export type TOTPResult =
  | { ok: true;  code: string; remaining: number; progress: number; error?: never }
  | { ok: false; error: string; code?: never; remaining?: never; progress?: never };

export async function generateTOTP(
  secret: string,
  digits = 6,
  period = 30
): Promise<TOTPResult> {
  try {
    const now      = Math.floor(Date.now() / 1000);
    const counter  = Math.floor(now / period);
    const remaining = period - (now % period);
    const progress  = (remaining / period) * 100;

    const keyBytes = base32Decode(secret); // throws on invalid Base32
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, intToBytes(counter));
    const hash   = new Uint8Array(signature);
    const offset = hash[hash.length - 1] & 0x0f;
    const code   =
      ((hash[offset]     & 0x7f) << 24 |
       (hash[offset + 1] & 0xff) << 16 |
       (hash[offset + 2] & 0xff) << 8  |
       (hash[offset + 3] & 0xff)) % Math.pow(10, digits);

    return {
      ok: true,
      code: code.toString().padStart(digits, '0'),
      remaining,
      progress,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Invalid TOTP secret',
    };
  }
}

export function parseTOTPUri(uri: string): { secret: string; name: string; issuer: string } | null {
  try {
    const url = new URL(uri);
    if (url.protocol !== 'otpauth:') return null;
    const secret = url.searchParams.get('secret') || '';
    if (!secret) return null;
    const issuer = url.searchParams.get('issuer') || '';
    const name   = decodeURIComponent(url.pathname.replace('//', '').replace(/^.*?:/, ''));
    return { secret: secret.toUpperCase().trim(), name, issuer };
  } catch {
    return null;
  }
}
