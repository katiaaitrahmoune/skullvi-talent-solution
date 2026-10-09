import { round } from "../text.ts";
import type { CandidateData, Flag, Tier } from "../types.ts";

export type FlagInput = {
  data: CandidateData;
  total: number | null;
  tiers: Tier[];
  margin: number;
  returning: boolean;
  educationMatched: boolean;
  knockoutAfterChange: boolean;
};

/** "Generate flags": borderline scores and missing data, so a reviewer knows where to look. */
export function buildFlags(i: FlagInput): Flag[] {
  const f: Flag[] = [];
  const d = i.data;
  if (i.knockoutAfterChange) f.push({ code: "knockout_after_rubric_change", severity: "high", message: "Ne respecte plus les critères éliminatoires de la nouvelle grille : à examiner." });
  if (i.returning) f.push({ code: "returning_candidate", severity: "info", message: "Cette personne a déjà candidaté à une autre offre." });
  if (i.total !== null) {
    const edges = i.tiers.filter((t) => t.min > 0);
    const near = edges.map((t) => ({ t, gap: Math.abs(i.total! - t.min) })).sort((a, b) => a.gap - b.gap)[0];
    if (near && near.gap <= i.margin) f.push({ code: "borderline", severity: "warn", message: `Score à ${round(near.gap, 1)} point(s) du seuil du tier ${near.t.tier}.` });
  }
  if (!d.cvName) f.push({ code: "no_cv", severity: "warn", message: "Aucun CV fourni." });
  if (!d.projectLink) f.push({ code: "no_project_link", severity: "warn", message: "Aucun lien vers le projet." });
  if (d.skills.length < 3) f.push({ code: "few_skills", severity: "warn", message: "Moins de 3 compétences indiquées." });
  if (!i.educationMatched) f.push({ code: "education_unrecognized", severity: "warn", message: "Formation non reconnue par la table de règles." });
  if (!d.github) f.push({ code: "no_github", severity: "info", message: "Pas de profil GitHub." });
  if (!d.experience.length) f.push({ code: "no_experience", severity: "info", message: "Aucune expérience renseignée." });
  if (d.coverLetter.trim().length < 300) f.push({ code: "short_letter", severity: "info", message: "Lettre de motivation courte." });
  return f;
}
