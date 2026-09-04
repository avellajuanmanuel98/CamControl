import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth, AuthUser } from "../../middleware/auth";
import { env } from "../../config/env";
import { statusEvents, STATUS_CHANGED } from "../../utils/eventBus";
import { unauthorized } from "../../utils/AppError";

export const dashboardRouter = Router();

async function buildSummary() {
  const [totalsBySite, totalsGlobal] = await Promise.all([
    prisma.camera.groupBy({ by: ["siteId", "status"], _count: { _all: true } }),
    prisma.camera.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const sites = await prisma.site.findMany({ select: { id: true, name: true } });
  const siteNameById = new Map(sites.map((s) => [s.id, s.name]));

  const emptyCounts = { ONLINE: 0, OFFLINE: 0, WARNING: 0, UNCONFIGURED: 0 };
  const global = { ...emptyCounts, total: 0 };
  for (const row of totalsGlobal) {
    global[row.status] = row._count._all;
    global.total += row._count._all;
  }

  const bySiteMap = new Map<string, typeof emptyCounts & { total: number; siteId: string; siteName: string }>();
  for (const row of totalsBySite) {
    const entry =
      bySiteMap.get(row.siteId) ??
      { ...emptyCounts, total: 0, siteId: row.siteId, siteName: siteNameById.get(row.siteId) ?? "—" };
    entry[row.status] = row._count._all;
    entry.total += row._count._all;
    bySiteMap.set(row.siteId, entry);
  }

  return { global, bySite: Array.from(bySiteMap.values()) };
}

dashboardRouter.get(
  "/summary",
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json(await buildSummary());
  })
);

/**
 * Server-Sent Events stream: pushes a fresh summary whenever any camera's
 * status changes, plus a periodic heartbeat/full-refresh so a client that
 * missed an event (or just connected) never stays stale for long.
 * EventSource can't set an Authorization header, so the token travels as a
 * query param here and is verified the same way as the Bearer middleware.
 */
dashboardRouter.get(
  "/stream",
  asyncHandler(async (req, res) => {
    const token = String(req.query.token ?? "");
    try {
      jwt.verify(token, env.jwtSecret) as AuthUser;
    } catch {
      throw unauthorized("Token inválido para el stream");
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = async () => {
      const summary = await buildSummary();
      res.write(`event: summary\ndata: ${JSON.stringify(summary)}\n\n`);
    };

    await send();

    const onStatusChanged = (camera: unknown) => {
      res.write(`event: camera\ndata: ${JSON.stringify(camera)}\n\n`);
      send().catch(() => {});
    };
    statusEvents.on(STATUS_CHANGED, onStatusChanged);

    const heartbeat = setInterval(() => {
      res.write(": ping\n\n");
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      statusEvents.off(STATUS_CHANGED, onStatusChanged);
      res.end();
    });
  })
);
