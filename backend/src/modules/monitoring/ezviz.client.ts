import axios from "axios";

// Official EZVIZ Open Platform HTTP API (open.ys7.com). We deliberately use
// ONLY this documented, credentialed API — never the reverse-engineered
// consumer-app endpoints some community libraries use, to stay within
// EZVIZ's terms of use.
// Docs: https://open.ys7.com/help/en/492 , https://open.ys7.com/doc/en/HTTP/device_select.html
const BASE_URL = process.env.EZVIZ_API_BASE_URL ?? "https://open.ys7.com/api/lapp";

export interface EzvizDeviceInfo {
  deviceSerial: string;
  status: number; // 1 = online per EZVIZ docs, 0 = offline
  deviceName?: string;
  model?: string;
}

interface TokenCache {
  token: string;
  expiresAt: number; // epoch ms
}

const tokenCacheByKey = new Map<string, TokenCache>();

export class EzvizApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "EzvizApiError";
  }
}

async function getAccessToken(appKey: string, appSecret: string): Promise<string> {
  const cached = tokenCacheByKey.get(appKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const response = await axios.post(
    `${BASE_URL}/token/get`,
    new URLSearchParams({ appKey, appSecret }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 8000 }
  );

  const body = response.data;
  if (body?.code !== "200") {
    throw new EzvizApiError(body?.msg ?? "No se pudo obtener el token de EZVIZ", body?.code);
  }

  const token = body.data.accessToken as string;
  const expiresAt = Number(body.data.expireTime); // EZVIZ returns an epoch-ms expiry
  tokenCacheByKey.set(appKey, { token, expiresAt });
  return token;
}

/**
 * Queries device connectivity status via the official EZVIZ Open API.
 * This reflects whether the camera currently holds a live session with the
 * EZVIZ cloud (i.e. genuine network+device connectivity), not just that our
 * server can reach *something* — see docs/ARCHITECTURE.md for the discussion
 * of why this is the right proxy given the cameras sit behind NAT/WiFi.
 */
export async function fetchDeviceInfo(
  appKey: string,
  appSecret: string,
  deviceSerial: string
): Promise<EzvizDeviceInfo> {
  const accessToken = await getAccessToken(appKey, appSecret);

  const response = await axios.post(
    `${BASE_URL}/device/info`,
    new URLSearchParams({ accessToken, deviceSerial }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 8000 }
  );

  const body = response.data;
  if (body?.code !== "200") {
    throw new EzvizApiError(body?.msg ?? `EZVIZ devolvió un error para ${deviceSerial}`, body?.code);
  }

  return {
    deviceSerial,
    status: Number(body.data.status),
    deviceName: body.data.deviceName,
    model: body.data.deviceType ?? body.data.model,
  };
}
