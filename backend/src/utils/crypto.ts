import crypto from "crypto";
import { env } from "../config/env";

// AES-256-GCM encryption for secrets-at-rest (EZVIZ AppKey/AppSecret).
// Never log or return decrypted values through the API.
const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = Buffer.from(env.credentialsEncryptionKey, "hex");
  if (key.length !== 32) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY must be a 32-byte value encoded as 64 hex characters"
    );
  }
  return key;
}

/** Returns "iv:authTag:ciphertext" (all hex-encoded), safe to store in a text column. */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), ciphertext.toString("hex")].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivHex, authTagHex, ciphertextHex] = payload.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Malformed encrypted payload");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

export function sha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
