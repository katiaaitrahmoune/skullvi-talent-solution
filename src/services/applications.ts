import { z } from "zod";
import { pool, withTx } from "../db/pool.ts";
import { allowedEvents, type AppState } from "../domain/states.ts";
import { HttpError, notFound } from "../http/errors.ts";
import { audit } from "./audit.ts";
import { actorOf, type AuthUser } from "./context.ts";
import { assertPostAccess } from "./posts.ts";
import { transition } from "./pipeline.ts";
import { SCORED_CTE } from "./ranking.ts";

export const noteSchema = z.object({ body: z.string().trim().min(1, "Note vide").max(4000) });
export const adjustmentSchema = z.object({
  delta: z.number().int().min(-20).max(20).refine((n) => n !== 0, "Un ajustement de 0 n'a pas d'effet"),
  reason: z.string().trim().min(3, "Expliquez l'ajustement").max(1000),
});
export const decisionSchema = z.object({ decision: z.enum(["accept", "decline"]), note: z.string().trim().max(2000).default("") });

async function postIdOf(applicationId: string): Promise<string> {
  const r = await pool.query("select post_id from applications where id = $1", [applicationId]);
  if (!r.rowCount) throw notFound("Candidature");
  return r.rows[0].post_id;
}

/** Full file for the reviewer: profile, current evaluation with per-criterion breakdown, flags, notes, adjustment, history, audit. */
export async function getApplicationDetail(user: AuthUser, id: string) {
  await assertPostAccess(user, await postIdOf(id));
  const a = await pool.query(
    `with ${SCORED_CTE}
     select a.*, c.first_name, c.last_name, c.email, c.phone, c.country, c.city, p.title as post_title, p.current_rubric_version,
       l.rubric_version, l.eligible, l.knockouts, l.total::float8 as total, l.tier, l.breakdown, l.flags, l.created_at as evaluated_at,
       j.delta, j.reason as adj_reason
     from applications a join candidates c on c.id = a.candidate_id join posts p on p.id = a.post_id
       left join latest l on l.application_id = a.id left join adj j on j.application_id = a.id
     where a.id = $1`, [id]);
  const x = a.rows[0];
  const [notes, adjustments, history, trail] = await Promise.all([
    pool.query("select n.id, n.body, n.created_at, u.name as author from notes n join users u on u.id = n.author_id where n.application_id = $1 order by n.created_at", [id]),
    pool.query("select s.delta, s.reason, s.created_at, u.name as author from score_adjustments s join users u on u.id = s.author_id where s.application_id = $1 order by s.seq desc", [id]),
    pool.query("select seq, rubric_version, total::float8 as total, tier, created_at from evaluations where application_id = $1 order by seq desc", [id]),
    pool.query("select at, actor_label, action, details from audit_log where entity_type = 'application' and entity_id = $1 order by id desc limit 50", [id]),
  ]);
  const delta: number = x.delta ?? 0;
  return {
    id: x.id, reference: x.reference, status: x.status as AppState, source: x.source, returningCandidate: x.returning_candidate,
    submittedAt: x.created_at, post: { id: x.post_id, title: x.post_title },
    candidate: { firstName: x.first_name, lastName: x.last_name, email: x.email, phone: x.phone, country: x.country, city: x.city },
    data: x.data,
    files: (x.files as { field: string; name: string; size: number }[]).map(({ field, name, size }) => ({ field, name, size })),
    evaluation: x.total === null && x.eligible === null ? null : {
      rubricVersion: x.rubric_version, currentRubricVersion: x.current_rubric_version, stale: x.rubric_version !== x.current_rubric_version,
      eligible: x.eligible, knockouts: x.knockouts, total: x.total, tier: x.tier, breakdown: x.breakdown, flags: x.flags, at: x.evaluated_at,
    },
    adjustment: x.delta === null ? null : { delta: x.delta, reason: x.adj_reason },
    effectiveScore: x.total === null ? null : Math.max(0, Math.min(100, x.total + delta)),
    notes: notes.rows, adjustments: adjustments.rows, evaluations: history.rows, audit: trail.rows,
    allowedEvents: allowedEvents(x.status),
    decision: x.decided_at ? { at: x.decided_at, note: x.decision_note } : null,
  };
}

export async function addNote(user: AuthUser, id: string, body: string) {
  await assertPostAccess(user, await postIdOf(id));
  const r = await pool.query("insert into notes (application_id, author_id, body) values ($1, $2, $3) returning id, body, created_at", [id, user.id, body]);
  await audit(pool, { actor: actorOf(user), action: "note.added", entityType: "application", entityId: id });
  return { ...r.rows[0], author: user.name };
}

/** "Adjust": a reviewer corrects the machine score by up to ±20 points, with a mandatory reason. The latest adjustment replaces the previous one. */
export async function addAdjustment(user: AuthUser, id: string, input: z.infer<typeof adjustmentSchema>) {
  await assertPostAccess(user, await postIdOf(id));
  return withTx(async (c) => {
    const s = await c.query("select status from applications where id = $1 for update", [id]);
    if (!["scored", "in_review"].includes(s.rows[0].status)) throw new HttpError(409, "not_adjustable", "Seules les candidatures notées ou en revue peuvent être ajustées.");
    await c.query("insert into score_adjustments (application_id, author_id, delta, reason) values ($1, $2, $3, $4)", [id, user.id, input.delta, input.reason]);
    await audit(c, { actor: actorOf(user), action: "score.adjusted", entityType: "application", entityId: id, details: input });
  });
}

/** "Decide": In review --accept--> Shortlisted, or --decline--> Declined. Both are final. */
export async function decide(user: AuthUser, id: string, input: z.infer<typeof decisionSchema>) {
  await assertPostAccess(user, await postIdOf(id));
  return withTx(async (c) => {
    const s = await c.query("select status from applications where id = $1 for update", [id]);
    const to = await transition(c, id, s.rows[0].status, input.decision, actorOf(user), { note: input.note });
    await c.query("update applications set decided_by = $2, decided_at = now(), decision_note = $3 where id = $1", [id, user.id, input.note]);
    return to;
  });
}

export async function fileOf(user: AuthUser, id: string, field: string) {
  await assertPostAccess(user, await postIdOf(id));
  const r = await pool.query("select files from applications where id = $1", [id]);
  const f = (r.rows[0].files as { field: string; name: string; path: string; mime: string }[]).find((x) => x.field === field);
  if (!f) throw notFound("Fichier");
  return f;
}
