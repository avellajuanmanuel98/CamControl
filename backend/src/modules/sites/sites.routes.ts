import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { notFound, conflict } from "../../utils/AppError";

export const sitesRouter = Router();
sitesRouter.use(requireAuth);

const siteSchema = z.object({
  name: z.string().min(1),
  code: z.string().trim().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/** GET /sites - list with live camera stats per site */
sitesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const sites = await prisma.site.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { cameras: true } },
        cameras: { select: { status: true } },
      },
    });

    const result = sites.map((site) => {
      const stats = { total: site.cameras.length, online: 0, offline: 0, warning: 0, unconfigured: 0 };
      for (const cam of site.cameras) {
        if (cam.status === "ONLINE") stats.online++;
        else if (cam.status === "OFFLINE") stats.offline++;
        else if (cam.status === "WARNING") stats.warning++;
        else stats.unconfigured++;
      }
      const { cameras, _count, ...rest } = site;
      return { ...rest, stats };
    });

    res.json(result);
  })
);

sitesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const site = await prisma.site.findUnique({ where: { id: req.params.id } });
    if (!site) throw notFound("Sede");
    res.json(site);
  })
);

sitesRouter.post(
  "/",
  requireRole("ADMIN", "OPERATOR"),
  asyncHandler(async (req, res) => {
    const data = siteSchema.parse(req.body);
    const site = await prisma.site.create({ data });
    res.status(201).json(site);
  })
);

sitesRouter.put(
  "/:id",
  requireRole("ADMIN", "OPERATOR"),
  asyncHandler(async (req, res) => {
    const data = siteSchema.partial().parse(req.body);
    const site = await prisma.site
      .update({ where: { id: req.params.id }, data })
      .catch(() => null);
    if (!site) throw notFound("Sede");
    res.json(site);
  })
);

sitesRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const camerasCount = await prisma.camera.count({ where: { siteId: req.params.id } });
    if (camerasCount > 0) {
      throw conflict(
        `No se puede eliminar: la sede tiene ${camerasCount} cámara(s) asociada(s). Reasígnalas primero.`
      );
    }
    await prisma.site.delete({ where: { id: req.params.id } }).catch(() => {
      throw notFound("Sede");
    });
    res.status(204).send();
  })
);
