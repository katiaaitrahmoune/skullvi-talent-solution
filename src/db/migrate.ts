import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, withTx } from "./pool.ts";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../migrations");

export async function migrate() {
  await pool.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await pool.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name));
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    await withTx(async (c) => {
      await c.query(fs.readFileSync(path.join(dir, file), "utf8"));
      await c.query("insert into schema_migrations (name) values ($1)", [file]);
    });
    console.log(`applied ${file}`);
  }
}

// Run directly: `npm run db:migrate`
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  migrate().then(() => pool.end()).catch((e) => { console.error(e); process.exit(1); });
}
