import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { prisma } from "../../db/prisma";
import { listCredentials, upsertCredential, getActiveCredential } from "./credentials.service";
import { checkCameraById } from "./monitor.service";
import { EzvizApiError, getEzvizAccessToken } from "./ezviz.client";
import { badRequest, notFound } from "../../utils/AppError";

export const monitoringRouter = Router();
monitoringRouter.use(requireAuth);

// EZVIZ AppKey/AppSecret are write-only from the API's perspective: they can
// be set/rotated by an admin but are never read back, per the security
// requirement that credentials must not be exposed to the frontend.
monitoringRouter.get(
  "/credentials",
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    res.json(await listCredentials());
  })
);

const credentialSchema = z.object({
  label: z.string().min(1),
  appKey: z.string().min(1),
  appSecret: z.string().min(1),
});

monitoringRouter.post(
  "/credentials",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = credentialSchema.parse(req.body);
    const created = await upsertCredential(data.label, data.appKey, data.appSecret);
    res.status(201).json(created);
  })
);

monitoringRouter.post(
  "/cameras/:id/check",
  requireRole("ADMIN", "OPERATOR"),
  asyncHandler(async (req, res) => {
    const result = await checkCameraById(req.params.id);
    if (!result) {
      throw badRequest(
        "No se pudo verificar: la cámara no tiene ezvizDeviceSerial o no hay credenciales EZVIZ activas"
      );
    }
    res.json(result);
  })
);

// Everything the EZUIKit web player needs to open a live stream in the
// browser: an accessToken and an ezopen:// URL. We deliberately do NOT
// embed the device's verification code (`cifrado`) in the URL here —
// verified against a real device that once its encryption gate has been
// accepted once (from any first-party EZVIZ client, e.g. the Open Platform
// console), the plain address plays fine and embedding the code anyway
// caused playback to fail. If a genuinely still-encrypted device needs it,
// EZUIKit's handleError callback (nErrorCode 5) is the signal to prompt for
// it and retry via changePlayUrl — not something to guess upfront.
monitoringRouter.get(
  "/cameras/:id/live",
  asyncHandler(async (req, res) => {
    const camera = await prisma.camera.findUnique({ where: { id: req.params.id } });
    if (!camera) throw notFound("Cámara");
    if (!camera.ezvizDeviceSerial) {
      throw badRequest("Esta cámara no tiene un serial EZVIZ configurado");
    }

    const credential = await getActiveCredential();
    if (!credential) {
      throw badRequest("No hay credenciales EZVIZ activas configuradas");
    }

    let accessToken: string;
    try {
      accessToken = await getEzvizAccessToken(credential.appKey, credential.appSecret);
    } catch (err) {
      const message = err instanceof EzvizApiError ? `Error EZVIZ: ${err.message}` : "No se pudo contactar a EZVIZ";
      throw badRequest(message);
    }

    // Default to SD ("live", not "hd.live"): a technician glancing at a
    // wall of many cameras at once needs the account's shared bandwidth
    // to stretch across all of them, not just one HD stream. The player
    // exposes its own HD/SD toggle (template: "security") for zooming
    // into one camera when that matters more than the wall staying up.
    res.json({
      accessToken,
      url: `ezopen://open.ezviz.com/${camera.ezvizDeviceSerial}/1.live`,
    });
  })
);
