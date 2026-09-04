import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { listCredentials, upsertCredential } from "./credentials.service";
import { checkCameraById } from "./monitor.service";
import { badRequest } from "../../utils/AppError";

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
