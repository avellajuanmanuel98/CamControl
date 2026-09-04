import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { sitesRouter } from "./modules/sites/sites.routes";
import { camerasRouter } from "./modules/cameras/cameras.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { monitoringRouter } from "./modules/monitoring/monitoring.routes";
import { importRouter } from "./modules/import/import.routes";
import { usersRouter } from "./modules/users/users.routes";

export function createApp() {
  const app = express();

  // helmet's default CSP is meant for server-rendered HTML; this API serves
  // JSON + binary QR images to a separate frontend origin, so we keep the
  // other protections (no-sniff, no framing, HSTS, etc.) and disable CSP.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

  app.use("/api/auth", authRouter);
  app.use("/api/sites", sitesRouter);
  app.use("/api/cameras", camerasRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/monitoring", monitoringRouter);
  app.use("/api/import", importRouter);
  app.use("/api/users", usersRouter);

  app.use(errorHandler);

  return app;
}
