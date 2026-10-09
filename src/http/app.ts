import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "../config/env.ts";
import { pool } from "../db/pool.ts";
import { errorHandler } from "./middleware/error.ts";
import { authRouter } from "./routes/auth.ts";
import { publicRouter } from "./routes/public.ts";
import { staffRouter } from "./routes/staff.ts";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);
  app.use(helmet());
  // Bearer tokens (no cookies): no CSRF surface, so credentials are not needed in CORS.
  app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()), methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], allowedHeaders: ["Content-Type", "Authorization"] }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", async (_req, res) => { await pool.query("select 1"); res.json({ ok: true }); });
  app.use("/api/auth", authRouter);
  app.use("/api/staff", staffRouter);
  app.use("/api", publicRouter);

  app.use((_req, res) => { res.status(404).json({ code: "not_found", message: "Route inconnue." }); });
  app.use(errorHandler);
  return app;
}
