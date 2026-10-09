import { totalMonths } from "../months.ts";
import type { CriterionFn } from "./types.ts";

// EXPERIENCE - total months worked (overlaps counted once) mapped to points by the rubric's range table.
export const scoreExperience: CriterionFn = ({ data, rubric, now }) => {
  const months = totalMonths(data.experience, now);
  const steps = [...rubric.experienceTable].sort((a, b) => a.minMonths - b.minMonths);
  const step = [...steps].reverse().find((s) => months >= s.minMonths);
  return { score: step?.points ?? 0, notes: [`${months} mois d'expérience cumulés (stages et bénévolat inclus).`] };
};
