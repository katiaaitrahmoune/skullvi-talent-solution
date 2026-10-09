import pg from "pg";
import { env } from "../config/env.ts";

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 15_000, // a suspended Neon database needs a moment to wake up
  idleTimeoutMillis: 30_000,
});
// Managed Postgres (Neon...) closes idle connections: without this handler that would crash the process.
pool.on("error", (err) => console.warn("Idle database connection dropped:", err.message));
export type Db = pg.Pool | pg.PoolClient;

export async function withTx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}
