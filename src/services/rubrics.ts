import type { PoolClient } from "pg";
import { z } from "zod";
import { CRITERIA, type Rubric } from "../domain/types.ts";
import { HttpError } from "../http/errors.ts";
import { audit } from "./audit.ts";
import type { Actor } from "./context.ts";
import { rescoreScored } from "./pipeline.ts";

const level = z.enum(["bac", "bac2", "licence", "master", "doctorate"]);
const words = z.array(z.string().trim().min(1).max(60)).max(30);
const regexSource = z.string().min(1).max(120).refine((p) => { try { new RegExp(p); return true; } catch { return false; } }, "Expression régulière invalide");

export const rubricSchema = z.object({
  weights: z.object(Object.fromEntries(CRITERIA.map((k) => [k, z.number().min(0).max(100)])) as Record<(typeof CRITERIA)[number], z.ZodNumber>)
    .refine((w) => Math.round((Object.values(w) as number[]).reduce((a, b) => a + b, 0) * 100) / 100 === 100, "Le total des poids doit faire exactement 100"),
  skills: z.object({ required: words, preferred: words }),
  knockouts: z.array(z.discriminatedUnion("type", [
    z.object({ type: z.literal("min_education"), level }),
    z.object({ type: z.literal("required_skills"), skills: words.min(1), mode: z.enum(["all", "any"]) }),
    z.object({ type: z.literal("language"), language: z.string().trim().min(2).max(40) }),
    z.object({ type: z.literal("country_in"), countries: z.array(z.string().trim().min(1).max(60)).min(1).max(60) }),
  ])).max(10),
  experienceTable: z.array(z.object({ minMonths: z.number().int().min(0).max(600), points: z.number().min(0).max(1) })).min(1).max(12)
    .refine((t) => t.some((s) => s.minMonths === 0), "Une ligne doit commencer à 0 mois"),
  educationRules: z.array(z.object({ pattern: regexSource, level, points: z.number().min(0).max(1) })).min(1).max(20),
  tiers: z.array(z.object({ tier: z.string().min(1).max(10), min: z.number().min(0).max(100) })).min(1).max(8)
    .refine((t) => t.some((x) => x.min === 0), "Un tier doit avoir un seuil à 0").optional(),
});

export async function listRubricVersions(c: PoolClient, postId: string) {
  const r = await c.query(
    `select r.version, r.config, r.created_at, u.name as author
     from rubrics r left join users u on u.id = r.created_by where r.post_id = $1 order by r.version desc`, [postId]);
  return r.rows.map((x) => ({ version: x.version as number, config: x.config as Rubric, createdAt: x.created_at as string, author: (x.author as string | null) ?? null }));
}

/**
 * "Define rubric": a change never edits a version, it creates the next one, then re-scores
 * every application still in the Scored state (reviews already underway keep the version they were judged with).
 */
export async function createRubricVersion(c: PoolClient, postId: string, rubric: Rubric, actor: Actor) {
  const locked = await c.query("select current_rubric_version from posts where id = $1 for update", [postId]);
  if (!locked.rowCount) throw new HttpError(404, "not_found", "Offre introuvable.");
  const version: number = (await c.query("select coalesce(max(version), 0) + 1 as v from rubrics where post_id = $1", [postId])).rows[0].v;
  await c.query("insert into rubrics (post_id, version, config, created_by) values ($1, $2, $3, $4)", [postId, version, JSON.stringify(rubric), actor.id]);
  await c.query("update posts set current_rubric_version = $2, updated_at = now() where id = $1", [postId, version]);
  await audit(c, { actor, action: "rubric.created", entityType: "post", entityId: postId, details: { version } });
  const rescored = await rescoreScored(c, postId, actor);
  return { version, rescored };
}
