import { analyseEducation } from "../education.ts";
import { checkKnockouts } from "../eligibility.ts";
import { clamp01, round } from "../text.ts";
import { CRITERIA, type CandidateData, type CriterionKey, type CriterionResult, type EvaluationResult, type PostContext, type Rubric, type Tier } from "../types.ts";
import { scoreEducation } from "./education.ts";
import { scoreExperience } from "./experience.ts";
import { buildFlags } from "./flags.ts";
import { scoreMotivation } from "./motivation.ts";
import { scoreProfile } from "./profile.ts";
import { scoreProjects } from "./projects.ts";
import { scoreSkills } from "./skills.ts";
import { assignTier, tiersOf } from "./tiers.ts";
import type { CriterionFn } from "./types.ts";

const CRITERION_FNS: Record<CriterionKey, CriterionFn> = {
  skills: scoreSkills, projects: scoreProjects, motivation: scoreMotivation,
  experience: scoreExperience, education: scoreEducation, profile: scoreProfile,
};

export type EvaluateInput = {
  data: CandidateData;
  post: PostContext;
  rubric: Rubric;
  now?: Date;
  returning?: boolean;
  configuredTiers?: Tier[]; // thresholds from config; the rubric may override them
  borderlineMargin?: number;
  /** false when re-scoring a candidate who is already Scored: the knockout failure is flagged, not enforced. */
  enforceKnockouts?: boolean;
};

/**
 * Eligible? -> (fork) six criteria in parallel -> Sum weighted score -> Assign tier -> Generate flags.
 * Pure and deterministic: same input, same output.
 */
export async function evaluate(i: EvaluateInput): Promise<EvaluationResult> {
  const now = i.now ?? new Date();
  const enforce = i.enforceKnockouts ?? true;
  const margin = i.borderlineMargin ?? 3;
  const tiers = tiersOf(i.rubric, i.configuredTiers);
  const education = analyseEducation(i.data, i.rubric.educationRules);
  const failures = checkKnockouts(i.data, i.rubric);

  if (failures.length && enforce) {
    return {
      eligible: false, knockouts: failures, total: null, tier: null, breakdown: [],
      flags: buildFlags({ data: i.data, total: null, tiers, margin, returning: i.returning ?? false, educationMatched: education.matched, knockoutAfterChange: false }),
    };
  }

  const ctx = { data: i.data, post: i.post, rubric: i.rubric, now };
  const breakdown: CriterionResult[] = await Promise.all(
    CRITERIA.map(async (key) => {
      const out = await CRITERION_FNS[key](ctx);
      const score = round(clamp01(out.score), 3);
      const weight = i.rubric.weights[key];
      return { key, score, weight, points: round(score * weight, 2), notes: out.notes };
    }),
  );
  const total = round(breakdown.reduce((s, c) => s + c.points, 0), 2);
  return {
    eligible: failures.length === 0,
    knockouts: failures,
    total,
    tier: assignTier(total, tiers),
    breakdown,
    flags: buildFlags({ data: i.data, total, tiers, margin, returning: i.returning ?? false, educationMatched: education.matched, knockoutAfterChange: failures.length > 0 }),
  };
}
