import type { Rubric } from "./admin-types";

// Same defaults as the backend (backend/src/domain/defaults.ts), used when an offer is created.
export const DEFAULT_RUBRIC: Rubric = {
  weights: { skills: 30, projects: 20, motivation: 15, experience: 15, education: 10, profile: 10 },
  skills: { required: [], preferred: [] },
  knockouts: [],
  experienceTable: [
    { minMonths: 0, points: 0 }, { minMonths: 3, points: 0.35 }, { minMonths: 6, points: 0.55 },
    { minMonths: 12, points: 0.75 }, { minMonths: 24, points: 0.9 }, { minMonths: 36, points: 1 },
  ],
  educationRules: [
    { pattern: "doctorat|phd|doctorate", level: "doctorate", points: 1 },
    { pattern: "master|ingenieur|engineer|bac ?\\+ ?5|\\bm2\\b|\\bm1\\b", level: "master", points: 0.95 },
    { pattern: "licence|bachelor|bac ?\\+ ?3|\\bl3\\b", level: "licence", points: 0.8 },
    { pattern: "\\bbts\\b|\\bdut\\b|deug|bac ?\\+ ?2|technicien superieur|associate", level: "bac2", points: 0.6 },
    { pattern: "\\bbac(calaureat)?\\b|lycee|high school|secondary", level: "bac", points: 0.4 },
  ],
};
export const POST_TYPES = ["Programme", "Stage", "Emploi", "Freelance", "Bénévolat"];
export const POST_MODES = ["À distance", "Hybride", "Sur site"];
export const MIN_EDUCATION = ["Aucun prérequis", "Baccalauréat", "Bac+2", "Licence (Bac+3)", "Master (Bac+5)"];
