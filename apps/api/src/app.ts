import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env, features } from "./config/env";
import { logger } from "./lib/logger";
import { PUBLIC_DIR } from "./lib/storage";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { machinesRouter } from "./modules/machines/machines.routes";
import { uploadsRouter } from "./modules/uploads/uploads.routes";
import { bookingsRouter } from "./modules/bookings/bookings.routes";
import { vendorRouter } from "./modules/vendor/vendor.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { webhooksRouter } from "./modules/webhooks/webhooks.routes";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1); // Render/Vercel sit in front of us; needed for correct IPs in rate limiting
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.WEB_URL.split(",").map((s) => s.trim()) }));
  if (env.NODE_ENV !== "test") app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));

  // Webhooks first: they need the raw body, before JSON parsing.
  app.use("/api/v1/webhooks", webhooksRouter);
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Dev mode: serve locally uploaded photos.
  if (!features.cloudinary) app.use("/uploads/public", express.static(path.resolve(PUBLIC_DIR)));

  const api = express.Router();
  api.use("/auth", authRouter);
  api.use("/me", usersRouter);
  api.use("/categories", categoriesRouter);
  api.use("/machines", machinesRouter);
  api.use("/uploads", uploadsRouter);
  api.use("/bookings", bookingsRouter);
  api.use("/vendor", vendorRouter);
  api.use("/admin", adminRouter);
  app.use("/api/v1", api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
