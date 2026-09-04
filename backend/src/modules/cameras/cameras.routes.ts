import fs from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { badRequest, notFound } from "../../utils/AppError";
import { sha256 } from "../../utils/crypto";
import {
  assertAllowedImage,
  extractEzvizSerialFromQrText,
  generateQrFilename,
  qrStorageDir,
  tryDecodeQr,
} from "./qr.util";

export const camerasRouter = Router();
camerasRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB is plenty for a QR photo
});

const cameraSchema = z.object({
  serialNumber: z.string().min(1),
  code: z.string().optional().nullable(),
  cifrado: z.string().optional().nullable(),
  capacidad: z.string().optional().nullable(),
  sharedUser: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
  ipAddress: z.string().optional().nullable(),
  hostname: z.string().optional().nullable(),
  port: z.coerce.number().int().positive().optional().nullable(),
  ezvizDeviceSerial: z.string().optional().nullable(),
  siteId: z.string().uuid(),
  status: z.enum(["ONLINE", "OFFLINE", "WARNING", "UNCONFIGURED"]).optional(),
});

const listQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
  status: z.enum(["ONLINE", "OFFLINE", "WARNING", "UNCONFIGURED"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const cameraSummarySelect = {
  id: true,
  serialNumber: true,
  code: true,
  cifrado: true,
  capacidad: true,
  sharedUser: true,
  model: true,
  observations: true,
  ipAddress: true,
  hostname: true,
  port: true,
  ezvizDeviceSerial: true,
  status: true,
  lastCheckedAt: true,
  lastOnlineAt: true,
  lastLatencyMs: true,
  siteId: true,
  createdAt: true,
  updatedAt: true,
  site: { select: { id: true, name: true } },
  qrAsset: { select: { id: true, filename: true, mimeType: true, createdAt: true } },
} as const;

camerasRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const where = {
      ...(query.siteId ? { siteId: query.siteId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { serialNumber: { contains: query.search, mode: "insensitive" as const } },
              { code: { contains: query.search, mode: "insensitive" as const } },
              { model: { contains: query.search, mode: "insensitive" as const } },
              { ipAddress: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.camera.findMany({
        where,
        select: cameraSummarySelect,
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.camera.count({ where }),
    ]);

    res.json({ items, total, page: query.page, pageSize: query.pageSize });
  })
);

camerasRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const camera = await prisma.camera.findUnique({
      where: { id: req.params.id },
      select: cameraSummarySelect,
    });
    if (!camera) throw notFound("Cámara");
    res.json(camera);
  })
);

camerasRouter.get(
  "/:id/history",
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(String(req.query.limit ?? "100"), 10) || 100, 500);
    const events = await prisma.cameraStatusEvent.findMany({
      where: { cameraId: req.params.id },
      orderBy: { checkedAt: "desc" },
      take: limit,
    });
    res.json(events);
  })
);

camerasRouter.post(
  "/",
  requireRole("ADMIN", "OPERATOR"),
  asyncHandler(async (req, res) => {
    const data = cameraSchema.parse(req.body);
    const camera = await prisma.camera.create({
      data: { ...data, createdById: req.user!.id },
      select: cameraSummarySelect,
    });
    res.status(201).json(camera);
  })
);

camerasRouter.put(
  "/:id",
  requireRole("ADMIN", "OPERATOR"),
  asyncHandler(async (req, res) => {
    const data = cameraSchema.partial().parse(req.body);
    const camera = await prisma.camera
      .update({ where: { id: req.params.id }, data, select: cameraSummarySelect })
      .catch(() => null);
    if (!camera) throw notFound("Cámara");
    res.json(camera);
  })
);

camerasRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const camera = await prisma.camera.findUnique({
      where: { id: req.params.id },
      include: { qrAsset: true },
    });
    if (!camera) throw notFound("Cámara");

    await prisma.camera.delete({ where: { id: req.params.id } });

    if (camera.qrAsset) {
      await prisma.qrAsset.delete({ where: { id: camera.qrAsset.id } }).catch(() => {});
      const filePath = path.join(qrStorageDir(), camera.qrAsset.storagePath);
      fs.promises.unlink(filePath).catch(() => {});
    }
    res.status(204).send();
  })
);

// ---- QR handling ----

camerasRouter.post(
  "/:id/qr",
  requireRole("ADMIN", "OPERATOR"),
  upload.single("qr"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("Debes adjuntar un archivo de imagen en el campo 'qr'");
    assertAllowedImage(req.file.mimetype);

    const camera = await prisma.camera.findUnique({
      where: { id: req.params.id },
      include: { qrAsset: true },
    });
    if (!camera) throw notFound("Cámara");

    const filename = generateQrFilename(req.file.originalname);
    const destPath = path.join(qrStorageDir(), filename);
    await fs.promises.writeFile(destPath, req.file.buffer);

    const decodedText = await tryDecodeQr(req.file.buffer);
    const detectedSerial = decodedText ? extractEzvizSerialFromQrText(decodedText) : null;

    const newAsset = await prisma.qrAsset.create({
      data: {
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        storagePath: filename,
        checksum: sha256(req.file.buffer),
        decodedPayload: decodedText,
        uploadedById: req.user!.id,
      },
    });

    const previousAsset = camera.qrAsset;

    const updated = await prisma.camera.update({
      where: { id: camera.id },
      data: {
        qrAssetId: newAsset.id,
        ...(detectedSerial && !camera.ezvizDeviceSerial
          ? { ezvizDeviceSerial: detectedSerial, ezvizVerifiedFromQr: true }
          : {}),
      },
      select: cameraSummarySelect,
    });

    if (previousAsset) {
      await prisma.qrAsset.delete({ where: { id: previousAsset.id } }).catch(() => {});
      fs.promises.unlink(path.join(qrStorageDir(), previousAsset.storagePath)).catch(() => {});
    }

    res.status(201).json({ camera: updated, decodedText, detectedSerial });
  })
);

camerasRouter.get(
  "/:id/qr",
  asyncHandler(async (req, res) => {
    const camera = await prisma.camera.findUnique({
      where: { id: req.params.id },
      include: { qrAsset: true },
    });
    if (!camera?.qrAsset) throw notFound("QR");

    const filePath = path.join(qrStorageDir(), camera.qrAsset.storagePath);
    if (!fs.existsSync(filePath)) throw notFound("Archivo QR");

    res.setHeader("Content-Type", camera.qrAsset.mimeType);
    if (req.query.download === "1") {
      res.setHeader("Content-Disposition", `attachment; filename="${camera.qrAsset.filename}"`);
    }
    fs.createReadStream(filePath).pipe(res);
  })
);

camerasRouter.delete(
  "/:id/qr",
  requireRole("ADMIN", "OPERATOR"),
  asyncHandler(async (req, res) => {
    const camera = await prisma.camera.findUnique({
      where: { id: req.params.id },
      include: { qrAsset: true },
    });
    if (!camera?.qrAsset) throw notFound("QR");

    await prisma.camera.update({ where: { id: camera.id }, data: { qrAssetId: null } });
    await prisma.qrAsset.delete({ where: { id: camera.qrAsset.id } });
    fs.promises.unlink(path.join(qrStorageDir(), camera.qrAsset.storagePath)).catch(() => {});

    res.status(204).send();
  })
);
