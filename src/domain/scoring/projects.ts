import { clamp01 } from "../text.ts";
import type { CriterionFn } from "./types.ts";

export function isHttpUrl(u: string): boolean {
  try {
    const x = new URL(u);
    return (x.protocol === "https:" || x.protocol === "http:") && x.hostname.includes(".");
  } catch {
    return false;
  }
}

// PROJECTS - link check + completeness of the project story.
// Links (50 %): project link .25, GitHub .15, portfolio .10 (syntax check only, no network call).
// Story (50 %): what / difficulty / solution, each judged on length against a target.
export const scoreProjects: CriterionFn = ({ data }) => {
  const notes: string[] = [];
  const links =
    (isHttpUrl(data.projectLink) ? 0.25 : 0) + (isHttpUrl(data.github) ? 0.15 : 0) + (isHttpUrl(data.portfolio) ? 0.1 : 0);
  notes.push(`Liens valides : ${[isHttpUrl(data.projectLink) && "projet", isHttpUrl(data.github) && "GitHub", isHttpUrl(data.portfolio) && "portfolio"].filter(Boolean).join(", ") || "aucun"}.`);
  const part = (text: string, target: number) => clamp01(text.trim().length / target);
  const story = 0.5 * ((part(data.projectProud, 200) + part(data.projectChallenge, 150) + part(data.projectSolution, 150)) / 3);
  notes.push(`Description du projet complète à ${Math.round((story / 0.5) * 100)} %.`);
  return { score: clamp01(links + story), notes };
};
