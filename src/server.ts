import { env } from "./config/env.ts";
import { pool } from "./db/pool.ts";
import { createApp } from "./http/app.ts";

await pool.query("select 1").catch((e) => {
  console.error("Cannot reach PostgreSQL. Is it running (docker compose up -d) and DATABASE_URL correct?\n", e.message);
  process.exit(1);
});

const server = createApp().listen(env.PORT, () => {
  console.log(`Talent Engine API on :${env.PORT} (${env.NODE_ENV}), AI ${env.ANTHROPIC_API_KEY ? `enabled (${env.AI_MODEL})` : "disabled: fallback only"}`);
});

const stop = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
