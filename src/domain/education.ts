import { fold } from "./text.ts";
import type { CandidateData, EducationLevel, EducationRule } from "./types.ts";

export const LEVEL_RANK: Record<EducationLevel, number> = { bac: 1, bac2: 2, licence: 3, master: 4, doctorate: 5 };

export type EducationAnalysis = {
  matched: boolean;
  label: string; // best programme found, for explanations
  points: number; // 0..1, best rule points (ongoing studies count 90 %)
  completedRank: number; // used by the min_education knockout (ongoing studies count one level lower)
};

// The "rule table" of the activity diagram.
export function analyseEducation(data: CandidateData, rules: EducationRule[]): EducationAnalysis {
  let best: EducationAnalysis = { matched: false, label: "", points: 0, completedRank: 0 };
  for (const e of data.education) {
    const text = fold(e.degree);
    const rule = rules.find((r) => new RegExp(r.pattern).test(text));
    if (!rule) continue;
    const rank = LEVEL_RANK[rule.level];
    const points = rule.points * (e.ongoing ? 0.9 : 1);
    const completed = e.ongoing ? Math.max(rank - 1, 0) : rank;
    best = {
      matched: true,
      label: points > best.points ? e.degree : best.label,
      points: Math.max(best.points, points),
      completedRank: Math.max(best.completedRank, completed),
    };
  }
  return best;
}
