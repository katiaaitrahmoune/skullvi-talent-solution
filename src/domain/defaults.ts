import type { Rubric, Tier } from "./types.ts";

export const DEFAULT_TIERS: Tier[] = [
  { tier: "A", min: 75 },
  { tier: "B", min: 55 },
  { tier: "C", min: 35 },
  { tier: "D", min: 0 },
];

// Patterns run on folded text (lowercase, no accents).
export const DEFAULT_RUBRIC: Rubric = {
  weights: { skills: 30, projects: 20, motivation: 15, experience: 15, education: 10, profile: 10 },
  skills: { required: [], preferred: [] },
  knockouts: [],
  experienceTable: [
    { minMonths: 0, points: 0 },
    { minMonths: 3, points: 0.35 },
    { minMonths: 6, points: 0.55 },
    { minMonths: 12, points: 0.75 },
    { minMonths: 24, points: 0.9 },
    { minMonths: 36, points: 1 },
  ],
  educationRules: [
    { pattern: "doctorat|phd|doctorate", level: "doctorate", points: 1 },
    { pattern: "master|ingenieur|engineer|bac ?\\+ ?5|\\bm2\\b|\\bm1\\b", level: "master", points: 0.95 },
    { pattern: "licence|bachelor|bac ?\\+ ?3|\\bl3\\b", level: "licence", points: 0.8 },
    { pattern: "\\bbts\\b|\\bdut\\b|deug|bac ?\\+ ?2|technicien superieur|associate", level: "bac2", points: 0.6 },
    { pattern: "\\bbac(calaureat)?\\b|lycee|high school|secondary", level: "bac", points: 0.4 },
  ],
};

/** A fresh default rubric, with the post's skill keywords filled in. */
export function defaultRubric(skills?: { required?: string[]; preferred?: string[] }): Rubric {
  return structuredClone({ ...DEFAULT_RUBRIC, skills: { required: skills?.required ?? [], preferred: skills?.preferred ?? [] } });
}
