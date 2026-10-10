import cors, { type CorsOptions } from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "../config/env.ts";
import { pool } from "../db/pool.ts";
import { errorHandler } from "./middleware/error.ts";
import { authRouter } from "./routes/auth.ts";
import { publicRouter } from "./routes/public.ts";
import { staffRouter } from "./routes/staff.ts";

// Allowed browser origins from CORS_ORIGIN (comma separated). Trailing slashes and spaces are forgiven; "*" allows any site.
// Safe to allow broadly: staff routes need a Bearer token (no cookies), and the only browser-to-API calls are the public ones.
const allowed = env.CORS_ORIGIN.split(",").map((s) => s.trim().replace(/\/+$/, "").toLowerCase()).filter(Boolean);
const corsOrigin: CorsOptions["origin"] = allowed.includes("*")
  ? "*"
  : (origin, cb) => {
      if (!origin || allowed.includes(origin.toLowerCase())) return cb(null, true);
      console.warn(`CORS blocked origin "${origin}". Allowed: ${allowed.join(", ") || "(none)"}`);
      cb(null, false);
    };

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })); // this API is meant to be called from another site
  app.use(cors({ origin: corsOrigin, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], allowedHeaders: ["Content-Type", "Authorization"] }));
  app.use(express.json({ limit: "1mb" }));

  // `corsAllowed` shows what the running server really uses: open /api/health in a browser to check your setting.
  app.get("/api/health", async (_req, res) => { await pool.query("select 1"); res.json({ ok: true, corsAllowed: allowed }); });
  app.use("/api/auth", authRouter);
  app.use("/api/staff", staffRouter);
  app.use("/api", publicRouter);

  app.use((_req, res) => { res.status(404).json({ code: "not_found", message: "Route inconnue." }); });
  app.use(errorHandler);
  return app;
}