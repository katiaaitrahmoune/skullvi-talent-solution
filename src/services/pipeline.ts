// The activity diagram, as code:
//   Normalize -> Validate -> Known email? -> Save application (validated) -> Load post and rubric
//   -> Eligible? -> six criteria in parallel -> Sum -> Tier -> Flags -> Save evaluation -> (ranking is read-time)
import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { configuredTiers, env } from "../config/env.ts";
import { withTx } from "../db/pool.ts";
import { normalizeInput } from "../domain/normalize.ts";
import { evaluate } from "../domain/scoring/engine.ts";
import { nextState, type AppEvent, type AppState } from "../domain/states.ts";
import { flattenIssues, submissionSchema, toCandidateData } from "../domain/submission.ts";
import type { CandidateData, EvaluationResult, Rubric } from "../domain/types.ts";
import { HttpError } from "../http/errors.ts";
import { audit } from "./audit.ts";
import { SYSTEM, type Actor } from "./context.ts";
import type { StoredFile } from "./files.ts";

export type IntakeResult = { ok: true; data: CandidateData; postId?: string } | { ok: false; errors: Record<string, string> };

/** Receive request -> Normalize input -> Run validators. Pure: touches no database. */
export function intake(raw: unknown): IntakeResult {
  const parsed = submissionSchema.safeParse(normalizeInput(raw));
  if (!parsed.success) return { ok: false, errors: flattenIssues(parsed.error) };
  return { ok: true, data: toCandidateData(parsed.data), postId: parsed.data.postId };
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export function newReference(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `SKV-${new Date().getFullYear()}-${s}`;
}

type PostRow = { id: string; title: string; organisation: string; status: string; autoQueue: boolean; rubricVersion: number; rubric: Rubric };

/** "Load post and rubric (current version)". Two statements on purpose: see the note on READ COMMITTED below. */
export async function loadPostAndRubric(c: PoolClient, postId: string, lock = false): Promise<PostRow> {
  const p = await c.query(
    `select id, title, organisation, status, auto_queue, current_rubric_version from posts where id = $1 ${lock ? "for share" : ""}`,
    [postId],
  );
  if (!p.rowCount) throw new HttpError(404, "not_found", "Offre introuvable.");
  const row = p.rows[0];
  // Separate statement => fresh snapshot, so a rubric version committed while we waited on the lock is visible.
  const r = await c.query("select config from rubrics where post_id = $1 and version = $2", [postId, row.current_rubric_version]);
  if (!r.rowCount) throw new HttpError(500, "rubric_missing", "Grille d'évaluation introuvable pour cette offre.");
  return { id: row.id, title: row.title, organisation: row.organisation, status: row.status, autoQueue: row.auto_queue, rubricVersion: row.current_rubric_version, rubric: r.rows[0].config };
}

/** Apply a state-machine event to an application (optimistic: fails if someone else moved it first). */
export async function transition(c: PoolClient, applicationId: string, from: AppState, event: AppEvent, actor: Actor, details: Record<string, unknown> = {}): Promise<AppState> {
  const to = nextState(from, event);
  if (!to) throw new HttpError(409, "invalid_transition", `Action impossible : la candidature est « ${from} » (${event}).`);
  if (to !== from) {
    const r = await c.query("update applications set status = $1, updated_at = now() where id = $2 and status = $3", [to, applicationId, from]);
    if (r.rowCount !== 1) throw new HttpError(409, "conflict", "La candidature a changé entre-temps. Rechargez la page.");
  }
  await audit(c, { actor, action: `application.${event}`, entityType: "application", entityId: applicationId, details: { from, to, ...details } });
  return to;
}

/** "Save evaluation: score, tier, audit log". Append-only. */
export async function saveEvaluation(c: PoolClient, applicationId: string, rubricVersion: number, r: EvaluationResult) {
  await c.query(
    `insert into evaluations (application_id, rubric_version, eligible, knockouts, total, tier, breakdown, flags)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [applicationId, rubricVersion, r.eligible, JSON.stringify(r.knockouts), r.total, r.tier, JSON.stringify(r.breakdown), JSON.stringify(r.flags)],
  );
}

export type NewApplication = { postId: string; data: CandidateData; source: "form" | "csv"; reference: string; files: StoredFile[]; actor: Actor };
export type Created = { applicationId: string; reference: string; status: AppState; returningCandidate: boolean; total: number | null; tier: string | null };

export async function persistAndScore(input: NewApplication): Promise<Created> {
  return withTx(async (c) => {
    const post = await loadPostAndRubric(c, input.postId, true);
    const accepting = input.source === "form" ? post.status === "open" : post.status !== "draft";
    if (!accepting) throw new HttpError(404, "closed", "Cette offre n'accepte plus de candidatures.");

    // Known email? yes -> reuse the record and flag; no -> create candidate (unique email).
    const d = input.data;
    const cand = await c.query(
      `insert into candidates (email, first_name, last_name, phone, country, city) values ($1, $2, $3, $4, $5, $6)
       on conflict (email) do update set first_name = excluded.first_name, last_name = excluded.last_name,
         phone = excluded.phone, country = excluded.country, city = excluded.city, updated_at = now()
       returning id, (xmax = 0) as inserted`,
      [d.email, d.firstName, d.lastName, d.phone, d.country, d.city],
    );
    const candidateId: string = cand.rows[0].id;
    const returning = !cand.rows[0].inserted;

    // One application per person per offer (a second one would pollute the ranking). Rolled back with the upsert above.
    const dup = await c.query("select 1 from applications where post_id = $1 and candidate_id = $2", [input.postId, candidateId]);
    if ((dup.rowCount ?? 0) > 0) throw new HttpError(409, "duplicate", "Une candidature existe déjà avec cet e-mail pour cette offre.");

    // Submitted --valid--> Validated: "Save application, status validated"
    const validated = nextState("submitted", "valid")!;
    const ins = await c.query(
      `insert into applications (reference, post_id, candidate_id, status, source, returning_candidate, data, files)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [input.reference, input.postId, candidateId, validated, input.source, returning, JSON.stringify(d), JSON.stringify(input.files)],
    );
    const applicationId: string = ins.rows[0].id;
    await audit(c, { actor: input.actor, action: "application.received", entityType: "application", entityId: applicationId, details: { source: input.source, reference: input.reference, returningCandidate: returning } });

    // Eligible? -> parallel criteria -> sum -> tier -> flags
    const result = await evaluate({
      data: d, post: { title: post.title, organisation: post.organisation }, rubric: post.rubric,
      returning, configuredTiers, borderlineMargin: env.BORDERLINE_MARGIN,
    });
    await saveEvaluation(c, applicationId, post.rubricVersion, result);

    let state = await transition(c, applicationId, validated, result.eligible ? "eligible" : "knockout_failed", SYSTEM, {
      rubricVersion: post.rubricVersion, total: result.total, tier: result.tier, knockouts: result.knockouts.map((k) => k.type),
    });
    if (result.eligible && post.autoQueue) state = await transition(c, applicationId, state, "queued", SYSTEM);
    return { applicationId, reference: input.reference, status: state, returningCandidate: returning, total: result.total, tier: result.tier };
  });
}

/** Rubric change: every application still "Scored" is re-scored with the new version (self-loop in the state diagram). */
export async function rescoreScored(c: PoolClient, postId: string, actor: Actor): Promise<number> {
  const post = await loadPostAndRubric(c, postId);
  const apps = await c.query("select id, data, returning_candidate from applications where post_id = $1 and status = 'scored' order by created_at for update", [postId]);
  for (const a of apps.rows) {
    const result = await evaluate({
      data: a.data, post: { title: post.title, organisation: post.organisation }, rubric: post.rubric,
      returning: a.returning_candidate, configuredTiers, borderlineMargin: env.BORDERLINE_MARGIN, enforceKnockouts: false,
    });
    await saveEvaluation(c, a.id, post.rubricVersion, result);
    await transition(c, a.id, "scored", "rubric_change", actor, { rubricVersion: post.rubricVersion, total: result.total, tier: result.tier });
  }
  return apps.rowCount ?? 0;
}
