import { analyseEducation, LEVEL_RANK } from "./education.ts";
import { canonSkill, containsTerm, fold } from "./text.ts";
import type { CandidateData, KnockoutFailure, Rubric } from "./types.ts";

const LEVEL_LABEL = { bac: "Baccalauréat", bac2: "Bac+2", licence: "Licence", master: "Master", doctorate: "Doctorat" } as const;

/** "Eligible?" step. Returns the failed knockout rules (empty = eligible). */
export function checkKnockouts(data: CandidateData, rubric: Rubric): KnockoutFailure[] {
  const failures: KnockoutFailure[] = [];
  const have = new Set(data.skills.map(canonSkill));
  for (const k of rubric.knockouts) {
    switch (k.type) {
      case "min_education": {
        const { completedRank } = analyseEducation(data, rubric.educationRules);
        if (completedRank < LEVEL_RANK[k.level])
          failures.push({ type: k.type, message: `Niveau d'études minimum requis : ${LEVEL_LABEL[k.level]}` });
        break;
      }
      case "required_skills": {
        const wanted = k.skills.map(canonSkill);
        const hits = wanted.filter((s) => have.has(s));
        const ok = k.mode === "all" ? hits.length === wanted.length : hits.length > 0;
        if (!ok) {
          const missing = k.skills.filter((s) => !have.has(canonSkill(s)));
          failures.push({ type: k.type, message: `Compétence(s) indispensable(s) manquante(s) : ${(k.mode === "all" ? missing : k.skills).join(", ")}` });
        }
        break;
      }
      case "language":
        if (!containsTerm(fold(data.languages), fold(k.language))) failures.push({ type: k.type, message: `Langue indispensable non indiquée : ${k.language}` });
        break;
      case "country_in":
        if (!k.countries.map(fold).includes(fold(data.country))) failures.push({ type: k.type, message: `Pays non éligible : ${data.country}` });
        break;
    }
  }
  return failures;
}
