import fs from "fs";
import path from "path";
import crypto from "crypto";
import jsQR from "jsqr";
import Jimp from "jimp";
import { env } from "../../config/env";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

export function assertAllowedImage(mimeType: string) {
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error("Formato de imagen no soportado. Usa PNG, JPG o WEBP.");
  }
}

export function qrStorageDir(): string {
  const dir = path.resolve(env.qrStorageDir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function generateQrFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || ".png";
  return `${crypto.randomUUID()}${ext}`;
}

/**
 * Best-effort QR decode. EZVIZ device QR codes typically encode the device
 * verification info as plain text/URL, so a successful decode lets us
 * pre-fill the device serial automatically. Never throws: monitoring/QR
 * upload must not fail just because decoding didn't find a code.
 */
export async function tryDecodeQr(buffer: Buffer): Promise<string | null> {
  try {
    const image = await Jimp.read(buffer);
    const { data, width, height } = image.bitmap;
    const result = jsQR(new Uint8ClampedArray(data), width, height);
    return result?.data ?? null;
  } catch {
    return null;
  }
}

/** Extracts a plausible EZVIZ device serial from decoded QR text, if present. */
export function extractEzvizSerialFromQrText(text: string): string | null {
  // EZVIZ verification-code QR payloads commonly look like:
  // "EZVIZ://<serial>:<verificationCode>@..." or plain "<serial>;<code>"
  // or a URL with the serial as a query param. We keep this permissive and
  // conservative: only accept alphanumeric tokens 6-12 chars long, uppercase.
  const match = text.match(/\b[A-Z]{2,4}\d{6,10}\b/);
  return match ? match[0] : null;
}
