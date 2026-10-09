import type { Db } from "../db/pool.ts";
import type { Actor } from "./context.ts";

/** Append-only trail of everything that matters: state changes, scoring, imports, AI runs. */
export async function audit(db: Db, e: { actor: Actor; action: string; entityType: string; entityId: string; details?: unknown }) {
  await db.query(
    "insert into audit_log (actor_id, actor_label, action, entity_type, entity_id, details) values ($1, $2, $3, $4, $5, $6)",
    [e.actor.id, e.actor.label, e.action, e.entityType, e.entityId, JSON.stringify(e.details ?? {})],
  );
}
