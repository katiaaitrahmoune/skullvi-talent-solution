import { canonSkill, clamp01, containsTerm, fold, variantsOf } from "../text.ts";
import type { CriterionFn } from "./types.ts";

// SKILLS - keyword match. A rubric keyword scores 1 when the candidate lists it as a skill,
// 0.6 when it only appears in their project / experience / certificate text, 0 otherwise.
// Required keywords weigh 70 %, preferred 30 %.
export const scoreSkills: CriterionFn = ({ data, rubric }) => {
  const have = new Set(data.skills.map(canonSkill));
  const corpus = fold(
    [data.projectTitle, data.projectProud, data.projectChallenge, data.projectSolution,
      ...data.experience.flatMap((e) => [e.role, e.description]), ...data.certificates.map((c) => c.name)].join(" \n "),
  );
  const hit = (kw: string) => {
    const k = canonSkill(kw);
    if (have.has(k)) return 1;
    return variantsOf(k).some((v) => containsTerm(corpus, v)) ? 0.6 : 0;
  };
  const avg = (list: string[]) => list.reduce((s, k) => s + hit(k), 0) / list.length;

  const { required, preferred } = rubric.skills;
  const notes: string[] = [];
  if (!required.length && !preferred.length) {
    notes.push("Aucun mot-clé défini dans la grille : score basé sur le nombre de compétences listées.");
    return { score: clamp01(data.skills.length / 8), notes };
  }
  const req = required.length ? avg(required) : null;
  const pref = preferred.length ? avg(preferred) : null;
  if (required.length) {
    const missing = required.filter((k) => hit(k) === 0);
    notes.push(`Requises : ${required.filter((k) => hit(k) === 1).length}/${required.length} listées${missing.length ? `, absentes : ${missing.join(", ")}` : ""}.`);
  }
  if (preferred.length) notes.push(`Appréciées : ${preferred.filter((k) => hit(k) > 0).length}/${preferred.length} trouvées.`);
  const score = req !== null && pref !== null ? 0.7 * req + 0.3 * pref : (req ?? pref ?? 0);
  return { score: clamp01(score), notes };
};
