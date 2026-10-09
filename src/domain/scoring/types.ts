import type { CandidateData, PostContext, Rubric } from "../types.ts";

export type ScoringContext = { data: CandidateData; post: PostContext; rubric: Rubric; now: Date };
export type CriterionOutput = { score: number; notes: string[] }; // score 0..1
export type CriterionFn = (ctx: ScoringContext) => CriterionOutput | Promise<CriterionOutput>;
