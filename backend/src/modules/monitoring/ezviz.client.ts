import axios from "axios";

// Official EZVIZ Open Platform HTTP API. We deliberately use ONLY this
// documented, credentialed API — never the reverse-engineered consumer-app
// endpoints some community libraries use, to stay within EZVIZ's terms of
// use.
// Docs: https://open.ys7.com/help/en/492 , https://open.ys7.com/doc/en/HTTP/device_select.html
//
// EZVIZ splits accounts across regional API domains (China vs. international
// areas). token/get is reachable from a single global entry point regardless
// of the account's region, but its response carries an "areaDomain" field —
// the actual regional domain that MUST be used for every other call (like
// device/info); the token itself is only valid within that region. Calling
// a fixed domain for everything (e.g. always open.ys7.com, which is China's
// domain) fails with "appKey不存在"/"appKey does not exist" for accounts
// registered outside China.
const TOKEN_ENTRY_URL = process.env.EZVIZ_API_BASE_URL ?? "https://open.ezvizlife.com/api/lapp";

export interface EzvizDeviceInfo {
  deviceSerial: string;
  status: number; // 1 = online per EZVIZ docs, 0 = offline
  deviceName?: string;
  model?: string;
}

interface TokenCache {
  token: string;
  areaDomain: string;
  expiresAt: number; // epoch ms
}

const tokenCacheByKey = new Map<string, TokenCache>();

export class EzvizApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "EzvizApiError";
  }
}

async function getAccessToken(appKey: string, appSecret: string): Promise<TokenCache> {
  const cached = tokenCacheByKey.get(appKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached;
  }

  const response = await axios.post(
    `${TOKEN_ENTRY_URL}/token/get`,
    new URLSearchParams({ appKey, appSecret }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 8000 }
  );

  const body = response.data;
  if (body?.code !== "200") {
    throw new EzvizApiError(body?.msg ?? "No se pudo obtener el token de EZVIZ", body?.code);
  }

  const cache: TokenCache = {
    token: body.data.accessToken as string,
    // Fall back to the entry domain itself if EZVIZ ever omits areaDomain
    // (observed on some China-region responses).
    areaDomain: (body.data.areaDomain as string) || TOKEN_ENTRY_URL.replace(/\/api\/lapp\/?$/, ""),
    expiresAt: Number(body.data.expireTime), // EZVIZ returns an epoch-ms expiry
  };
  tokenCacheByKey.set(appKey, cache);
  return cache;
}

/**
 * Just the accessToken, for callers (like the live-view endpoint) that only
 * need to hand it to the EZUIKit player — the region routing (areaDomain)
 * only matters for our own device/info calls above.
 */
export async function getEzvizAccessToken(appKey: string, appSecret: string): Promise<string> {
  const cache = await getAccessToken(appKey, appSecret);
  return cache.token;
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
  const { token: accessToken, areaDomain } = await getAccessToken(appKey, appSecret);

  const response = await axios.post(
    `${areaDomain}/api/lapp/device/info`,
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
