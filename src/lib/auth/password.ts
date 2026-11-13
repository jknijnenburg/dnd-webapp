import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Password verifier format (no "$" so it survives dotenv variable expansion):
 *   scrypt:<N>:<r>:<p>:<salt base64url>:<hash base64url>
 */
const DEFAULTS = { N: 2 ** 15, r: 8, p: 1, keyLength: 64, saltLength: 16 };
const MAX_N = 2 ** 20;

function scryptAsync(password: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, keyLength, options, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

function options(N: number, r: number, p: number): ScryptOptions {
  return { N, r, p, maxmem: 256 * N * r };
}

export async function hashPassword(password: string): Promise<string> {
  const { N, r, p, keyLength, saltLength } = DEFAULTS;
  const salt = randomBytes(saltLength);
  const key = await scryptAsync(password, salt, keyLength, options(N, r, p));
  return ["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join(":");
}

/** Constant-time verification. Returns false (never throws) for malformed verifiers. */
export async function verifyPassword(password: string, verifier: string): Promise<boolean> {
  const parts = verifier.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (![N, r, p].every((n) => Number.isInteger(n) && n > 0) || N > MAX_N || r > 32 || p > 16) {
    return false;
  }
  try {
    const salt = Buffer.from(parts[4], "base64url");
    const expected = Buffer.from(parts[5], "base64url");
    if (salt.length < 8 || expected.length < 32) return false;
    const actual = await scryptAsync(password, salt, expected.length, options(N, r, p));
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
