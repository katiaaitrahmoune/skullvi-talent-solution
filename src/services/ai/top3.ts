// AI top-3 flow: Select top 10 -> Anonymize -> Build prompt -> Call model -> Valid? -> Top 3 | Fallback
//                -> Log prompt and output -> Reviewer confirms (accept / reorder / reject)
import { randomInt } from "node:crypto";
import { z } from "zod";
import { env } from "../../config/env.ts";
import { pool, withTx } from "../../db/pool.ts";
import { anonymize, assignAliases, buildPrompt, fallbackTop3, validateTop3, type PoolCandidate, type Top3Item } from "../../domain/ai.ts";
import type { Rubric } from "../../domain/types.ts";
import { HttpError, notFound } from "../../http/errors.ts";
import { audit } from "../audit.ts";
import { actorOf, type AuthUser } from "../context.ts";
import { assertPostAccess } from "../posts.ts";
import { transition } from "../pipeline.ts";
import { SCORED_CTE } from "../ranking.ts";
import { defaultModel, type Top3Model } from "./model.ts";

export const confirmSchema = z.object({ order: z.array(z.string().uuid()).max(3) });

const shuffle = (xs: string[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/** "Select top 10 by deterministic score" among candidates that are still in play. */
async function selectTop10(postId: string): Promise<PoolCandidate[]> {
  const orderBy = env.AI_SELECT_BY === "effective" ? "greatest(0, least(100, l.total + coalesce(j.delta, 0)))" : "l.total"; // fixed literals, not user input
  const r = await pool.query(
    `with ${SCORED_CTE}
     select a.id, a.data, l.total::float8 as total, l.tier, l.breakdown, l.flags, coalesce(j.delta, 0) as adjustment, j.reason as adjustment_reason,
       coalesce((select array_agg(n.body order by n.created_at) from notes n where n.application_id = a.id), '{}') as notes
     from applications a join latest l on l.application_id = a.id left join adj j on j.application_id = a.id
     where a.post_id = $1 and a.status in ('scored', 'in_review') and l.total is not null
     order by ${orderBy} desc, a.created_at asc limit 10`, [postId]);
  return r.rows.map((x) => ({ applicationId: x.id, data: x.data, total: x.total, tier: x.tier, breakdown: x.breakdown, flags: x.flags, adjustment: x.adjustment, adjustmentReason: x.adjustment_reason, notes: x.notes }));
}

export async function runTop3(user: AuthUser, postId: string, model: Top3Model | null = defaultModel()) {
  await assertPostAccess(user, postId);
  const post = (await pool.query("select title, organisation, description, missions, must_have, nice_to_have, current_rubric_version from posts where id = $1", [postId])).rows[0];
  const rubric = (await pool.query("select config from rubrics where post_id = $1 and version = $2", [postId, post.current_rubric_version])).rows[0].config as Rubric;

  const candidates = await selectTop10(postId);
  if (candidates.length < 3) throw new HttpError(409, "not_enough_candidates", "Il faut au moins 3 candidatures notées pour une suggestion.");

  const aliases = assignAliases(candidates.map((c) => c.applicationId), shuffle); // alias -> application id
  const aliasOf = new Map([...aliases].map(([alias, id]) => [id, alias]));
  const now = new Date();
  const prompt = buildPrompt({
    post: { title: post.title, organisation: post.organisation, description: post.description, missions: post.missions, mustHave: post.must_have, niceToHave: post.nice_to_have },
    rubric: { weights: rubric.weights, requiredSkills: rubric.skills.required, preferredSkills: rubric.skills.preferred },
    candidates: candidates.map((c) => anonymize(aliasOf.get(c.applicationId)!, c, now)),
  });

  let items: Top3Item[] | null = null;
  let status: "ok" | "fallback" = "fallback";
  let reason: string | null = null;
  let raw: string | null = null;
  let modelVersion: string | null = null;

  if (!model) reason = "no_api_key";
  else {
    try {
      const res = await model.call(prompt, AbortSignal.timeout(env.AI_TIMEOUT_MS));
      raw = res.raw;
      modelVersion = res.model;
      const v = validateTop3(res.output, [...aliases.keys()]);
      if (v.ok) { items = v.items; status = "ok"; } else reason = `invalid_output: ${v.reason}`;
    } catch (e) {
      const err = e as Error;
      reason = err.name === "TimeoutError" || err.name === "AbortError" ? "timeout" : `error: ${err.message}`.slice(0, 200);
    }
  }
  if (!items) items = fallbackTop3(candidates, (id) => aliasOf.get(id)!);

  const result = items.map((it, i) => ({ rank: i + 1, applicationId: aliases.get(it.id)!, alias: it.id, strengths: it.strengths, risks: it.risks, questions: it.questions }));
  const run = await pool.query(
    `insert into ai_runs (post_id, requested_by, status, fallback_reason, model, prompt, raw_output, candidate_map, result)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id, created_at`,
    [postId, user.id, status, reason, modelVersion, `${prompt.system}\n\n---\n\n${prompt.user}`, raw, JSON.stringify(Object.fromEntries(aliases)), JSON.stringify(result)]);
  await audit(pool, { actor: actorOf(user), action: status === "ok" ? "ai.top3" : "ai.top3.fallback", entityType: "post", entityId: postId, details: { runId: run.rows[0].id, model: modelVersion, reason } });
  return presentRun(run.rows[0].id);
}

/** Result for reviewers (names visible to them; only the model saw aliases). */
export async function presentRun(runId: string) {
  const r = await pool.query("select * from ai_runs where id = $1", [runId]);
  if (!r.rowCount) throw notFound("Suggestion");
  const run = r.rows[0];
  const ids = (run.result as { applicationId: string }[]).map((x) => x.applicationId);
  const people = await pool.query(
    `with ${SCORED_CTE}
     select a.id, a.reference, a.status, c.first_name, c.last_name, l.total::float8 as total, l.tier
     from applications a join candidates c on c.id = a.candidate_id left join latest l on l.application_id = a.id where a.id = any($1::uuid[])`, [ids]);
  type Person = { id: string; reference: string; status: string; first_name: string; last_name: string; total: number | null; tier: string | null };
  const byId = new Map((people.rows as Person[]).map((p) => [p.id, p] as const));
  return {
    id: run.id, postId: run.post_id, source: run.status === "ok" ? "ai" : "fallback", fallbackReason: run.fallback_reason, model: run.model,
    createdAt: run.created_at, confirmed: run.confirmed_at ? { at: run.confirmed_at, order: run.confirmed_order } : null,
    top3: (run.result as { rank: number; applicationId: string; strengths: string[]; risks: string[]; questions: string[] }[]).map((x) => {
      const p = byId.get(x.applicationId);
      return { rank: x.rank, applicationId: x.applicationId, reference: p?.reference, status: p?.status, name: p ? `${p.first_name} ${p.last_name}` : null, score: p?.total ?? null, tier: p?.tier ?? null, strengths: x.strengths, risks: x.risks, questions: x.questions };
    }),
  };
}

export async function latestRun(user: AuthUser, postId: string) {
  await assertPostAccess(user, postId);
  const r = await pool.query("select id from ai_runs where post_id = $1 order by created_at desc limit 1", [postId]);
  return r.rowCount ? presentRun(r.rows[0].id) : null;
}

/**
 * "Reviewer confirms: accept, reorder, reject". `order` is the final shortlist, in order, taken from the suggested 3:
 * anything left out is a rejected suggestion (the candidate is NOT declined by this). Each accepted candidate goes In review -> Shortlisted.
 */
export async function confirmRun(user: AuthUser, runId: string, order: string[]) {
  const r = await pool.query("select post_id, result, confirmed_at from ai_runs where id = $1", [runId]);
  if (!r.rowCount) throw notFound("Suggestion");
  await assertPostAccess(user, r.rows[0].post_id);
  if (r.rows[0].confirmed_at) throw new HttpError(409, "already_confirmed", "Cette suggestion a déjà été confirmée.");
  const suggested = new Set((r.rows[0].result as { applicationId: string }[]).map((x) => x.applicationId));
  if (new Set(order).size !== order.length || order.some((id) => !suggested.has(id))) throw new HttpError(422, "invalid_order", "La sélection doit être un sous-ensemble sans doublon des 3 candidats suggérés.");

  await withTx(async (c) => {
    for (const id of order) {
      const s = await c.query("select status from applications where id = $1 for update", [id]);
      await transition(c, id, s.rows[0].status, "accept", actorOf(user), { via: "ai_top3", runId });
      await c.query("update applications set decided_by = $2, decided_at = now(), decision_note = $3 where id = $1", [id, user.id, "Retenu via la suggestion top 3"]);
    }
    await c.query("update ai_runs set confirmed_by = $2, confirmed_at = now(), confirmed_order = $3 where id = $1", [runId, user.id, JSON.stringify(order)]);
    await audit(c, { actor: actorOf(user), action: "ai.top3.confirmed", entityType: "post", entityId: r.rows[0].post_id, details: { runId, accepted: order, rejectedSuggestions: [...suggested].filter((x) => !order.includes(x)) } });
  });
  return presentRun(runId);
}
