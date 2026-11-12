import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Envelope for marketplace tokens at rest: AES-256-GCM with a random 96-bit IV per value.
 * TOKEN_ENCRYPTION_KEY is a base64-encoded 32-byte key supplied by the environment (in production: from a KMS).
 * Stored format: v1.<iv>.<authTag>.<ciphertext>, all base64url. Tokens are never stored or logged in plaintext.
 */
function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  const k = Buffer.from(raw, "base64");
  if (k.length === 32) return k;
  // Any other value (e.g. a long passphrase typed in Vercel) is stretched to a 32-byte key.
  if (raw.length < 24) throw new Error("TOKEN_ENCRYPTION_KEY is too short (use 24+ characters)");
  return createHash("sha256").update(raw, "utf8").digest();
}
export function seal(plaintext: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plaintext, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}
export function open(sealed: string): string {
  const [v, iv, tag, body] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !body) throw new Error("Unrecognised token envelope");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
}
