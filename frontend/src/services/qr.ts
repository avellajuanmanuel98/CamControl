import { api } from "./api";

// QR images are served from an authenticated endpoint (never a public URL),
// so <img> tags can't just point at it directly — we fetch the bytes with
// our normal Authorization header and hand the browser an object URL.
const cache = new Map<string, string>();

export async function loadQrObjectUrl(cameraId: string): Promise<string> {
  const cached = cache.get(cameraId);
  if (cached) return cached;
  const { data } = await api.get(`/cameras/${cameraId}/qr`, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  cache.set(cameraId, url);
  return url;
}

export function invalidateQr(cameraId: string) {
  const url = cache.get(cameraId);
  if (url) URL.revokeObjectURL(url);
  cache.delete(cameraId);
}

export async function downloadQr(cameraId: string, filename: string) {
  const { data } = await api.get(`/cameras/${cameraId}/qr`, {
    params: { download: "1" },
    responseType: "blob",
  });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
