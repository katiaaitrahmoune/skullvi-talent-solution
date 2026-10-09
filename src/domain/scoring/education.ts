import { analyseEducation } from "../education.ts";
import type { CriterionFn } from "./types.ts";

// EDUCATION - rule table: the best recognised programme decides (ongoing studies count 90 %).
export const scoreEducation: CriterionFn = ({ data, rubric }) => {
  const a = analyseEducation(data, rubric.educationRules);
  return { score: a.points, notes: [a.matched ? `Meilleure formation reconnue : ${a.label}.` : "Aucune formation reconnue par la table de règles."] };
};
