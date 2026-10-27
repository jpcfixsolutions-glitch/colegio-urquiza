import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler, notFound } from "./middlewares/error-handler.js";
import apiRoutes from "./routes/api.routes.js";
import { createSupabaseKeepaliveRouter } from "./routes/supabase-keepalive.routes.js";

export function isOriginAllowed(origin, allowedOrigins, nodeEnv) {
  if (!origin || allowedOrigins.includes(origin)) return true;

  if (nodeEnv !== "production") {
    return /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(origin);
  }

  return false;
}

export function createApp(options = {}) {
  const app = express();
  const origins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").split(",").map((origin) => origin.trim());
  const nodeEnv = process.env.NODE_ENV || "development";
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin(origin, callback) { if (isOriginAllowed(origin, origins, nodeEnv)) callback(null, true); else callback(new Error("Origen no permitido")); }, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api/cron", createSupabaseKeepaliveRouter(options));
  app.use("/api", apiRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
