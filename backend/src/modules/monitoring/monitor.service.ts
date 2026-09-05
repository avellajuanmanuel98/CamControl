import { CameraStatus, CheckSource } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { statusEvents, STATUS_CHANGED } from "../../utils/eventBus";
import { getActiveCredential } from "./credentials.service";
import { EzvizApiError, fetchDeviceInfo } from "./ezviz.client";

interface CheckResult {
  status: CameraStatus;
  latencyMs: number | null;
  message: string | null;
  raw: unknown;
}

interface CameraForCheck {
  id: string;
  status: CameraStatus;
  ezvizDeviceSerial: string | null;
  consecutiveFails: number;
}

/**
 * Determines connectivity for a single camera using the EZVIZ Open API.
 * See docs/ARCHITECTURE.md ("A vs B") for why this cloud heartbeat is the
 * right primary signal for WiFi/NAT'd EZVIZ cameras, and how consecutive
 * failures are used to distinguish a real outage (OFFLINE) from a blip
 * (WARNING) instead of flipping state on a single failed check.
 */
async function checkCameraOnce(camera: CameraForCheck): Promise<CheckResult | null> {
  if (!camera.ezvizDeviceSerial) return null;

  const credential = await getActiveCredential();
  if (!credential) return null;

  const startedAt = Date.now();
  try {
    const info = await fetchDeviceInfo(credential.appKey, credential.appSecret, camera.ezvizDeviceSerial);
    const latencyMs = Date.now() - startedAt;

    if (info.status === 1) {
      return { status: "ONLINE", latencyMs, message: null, raw: info };
    }

    const fails = camera.consecutiveFails + 1;
    const status = fails >= env.monitorWarningFailThreshold ? "OFFLINE" : "WARNING";
    return { status, latencyMs, message: "EZVIZ reporta el dispositivo desconectado", raw: info };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const fails = camera.consecutiveFails + 1;
    const status = fails >= env.monitorWarningFailThreshold ? "OFFLINE" : "WARNING";
    const message =
      err instanceof EzvizApiError ? `Error EZVIZ: ${err.message}` : "No se pudo consultar EZVIZ (red/timeout)";
    return { status, latencyMs, message, raw: { error: message } };
  }
}

export async function checkCameraById(cameraId: string, source: CheckSource = "MANUAL") {
  const camera = await prisma.camera.findUnique({ where: { id: cameraId } });
  if (!camera) return null;
  return applyCheckResult(camera, source);
}

async function applyCheckResult(camera: CameraForCheck, source: CheckSource) {
  const result = await checkCameraOnce(camera);
  if (!result) return null;

  const isOnline = result.status === "ONLINE";
  const isTransition = result.status !== camera.status;
  const updated = await prisma.camera.update({
    where: { id: camera.id },
    data: {
      status: result.status,
      lastCheckedAt: new Date(),
      lastLatencyMs: result.latencyMs,
      consecutiveFails: isOnline ? 0 : camera.consecutiveFails + 1,
      ...(isOnline ? { lastOnlineAt: new Date() } : {}),
      ...(isTransition ? { statusChangedAt: new Date() } : {}),
    },
    select: {
      id: true,
      serialNumber: true,
      status: true,
      lastCheckedAt: true,
      lastOnlineAt: true,
      lastLatencyMs: true,
      statusChangedAt: true,
      siteId: true,
    },
  });

  // The history/activity feed is meant to read as "what changed", not a
  // flood of identical checks every couple of minutes. A manual check is
  // always logged (the operator explicitly asked for a record of it); a
  // scheduled check is only logged when the status actually transitions.
  if (source === "MANUAL" || isTransition) {
    await prisma.cameraStatusEvent.create({
      data: {
        cameraId: camera.id,
        status: result.status,
        source,
        latencyMs: result.latencyMs,
        message: result.message,
        rawResponse: result.raw as object,
      },
    });
  }

  statusEvents.emit(STATUS_CHANGED, updated);
  return updated;
}

let cycleRunning = false;

export async function runMonitoringCycle() {
  if (cycleRunning) return; // avoid overlapping cycles if one runs long
  cycleRunning = true;
  try {
    const cameras = await prisma.camera.findMany({
      where: { ezvizDeviceSerial: { not: null } },
      select: { id: true, status: true, ezvizDeviceSerial: true, consecutiveFails: true },
    });

    for (const camera of cameras) {
      await applyCheckResult(camera, "EZVIZ_API").catch((err) => {
        console.error(`Error monitoreando cámara ${camera.id}:`, err);
      });
    }
  } finally {
    cycleRunning = false;
  }
}

let schedulerHandle: NodeJS.Timeout | null = null;

export function startMonitoringScheduler() {
  if (schedulerHandle) return;
  const intervalMs = env.monitorIntervalSeconds * 1000;
  console.log(`Monitor: verificando cámaras cada ${env.monitorIntervalSeconds}s`);
  schedulerHandle = setInterval(() => {
    runMonitoringCycle().catch((err) => console.error("Error en ciclo de monitoreo:", err));
  }, intervalMs);
  // Kick off an initial cycle shortly after boot instead of waiting a full interval.
  setTimeout(() => runMonitoringCycle().catch((err) => console.error("Error en ciclo inicial:", err)), 5000);
}

export function stopMonitoringScheduler() {
  if (schedulerHandle) clearInterval(schedulerHandle);
  schedulerHandle = null;
}
