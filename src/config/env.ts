import "dotenv/config";
import { z } from "zod";
import { DEFAULT_TIERS } from "../domain/defaults.ts";
import type { Tier } from "../domain/types.ts";

const tierSchema = z.array(z.object({ tier: z.string().min(1), min: z.number().min(0).max(100) })).min(1)
  .refine((t) => t.some((x) => x.min === 0), "one tier must have min 0");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0), // number of reverse proxies in front (for rate limiting by real IP)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(10).optional(),
  UPLOAD_DIR: z.string().default("./uploads"),
  BORDERLINE_MARGIN: z.coerce.number().min(0).max(20).default(3),
  TIERS_JSON: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("claude-sonnet-5-5"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).default(20000),
  AI_SELECT_BY: z.enum(["deterministic", "effective"]).default("deterministic"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:\n" + parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n"));
  process.exit(1);
}
export const env = parsed.data;

/** "Thresholds from config": TIERS_JSON when set, otherwise the defaults. */
export const configuredTiers: Tier[] = (() => {
  if (!env.TIERS_JSON?.trim()) return DEFAULT_TIERS;
  const t = tierSchema.safeParse(JSON.parse(env.TIERS_JSON));
  if (!t.success) {
    console.error("Invalid TIERS_JSON: " + t.error.issues[0].message);
    process.exit(1);
  }
  return t.data;
})();
