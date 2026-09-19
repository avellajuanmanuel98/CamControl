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
// browser: an accessToken and an ezopen:// URL. The verification code
// (`cifrado`) is a per-device credential the EZVIZ apps themselves handle
// client-side (it's not an account-wide secret like AppKey/AppSecret), so
// embedding it in the URL here — never the AppKey/AppSecret — matches how
// EZVIZ's own clients work.
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

    const codePrefix = camera.cifrado ? `${camera.cifrado}@` : "";
    res.json({
      accessToken,
      url: `ezopen://${codePrefix}open.ezviz.com/${camera.ezvizDeviceSerial}/1.hd.live`,
    });
  })
);
