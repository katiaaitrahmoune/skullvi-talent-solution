// Pure domain types. Nothing in src/domain imports Express, pg or any I/O.

export const CRITERIA = ["skills", "projects", "motivation", "experience", "education", "profile"] as const;
export type CriterionKey = (typeof CRITERIA)[number];

export type DateRange = { startDate: string; ongoing: boolean; endDate: string };

export type CandidateData = {
  firstName: string; lastName: string; email: string; phone: string; country: string; city: string;
  cvName: string;
  education: (DateRange & { degree: string; institution: string; fileName: string })[];
  experience: (DateRange & { role: string; company: string; description: string })[];
  certificates: { name: string; issuer: string; date: string; url: string; fileName: string }[];
  skills: string[]; github: string; portfolio: string; linkedin: string;
  projectTitle: string; projectLink: string; projectProud: string; projectChallenge: string; projectSolution: string;
  availability: string; workMode: string; relocation: string; languages: string; expectations: string; heardFrom: string;
  coverLetter: string;
};

export type EducationLevel = "bac" | "bac2" | "licence" | "master" | "doctorate";

// Eligibility rules ("knockouts"): fail one and the application becomes Ineligible.
export type Knockout =
  | { type: "min_education"; level: EducationLevel }
  | { type: "required_skills"; skills: string[]; mode: "all" | "any" }
  | { type: "language"; language: string }
  | { type: "country_in"; countries: string[] };

// First rule whose regex matches the folded (lowercase, accent-free) degree wins.
export type EducationRule = { pattern: string; level: EducationLevel; points: number };
export type ExperienceStep = { minMonths: number; points: number }; // points 0..1
export type Tier = { tier: string; min: number };

// One rubric VERSION. A new version is created on every change; evaluations remember which one they used.
export type Rubric = {
  weights: Record<CriterionKey, number>; // must add up to 100
  skills: { required: string[]; preferred: string[] };
  knockouts: Knockout[];
  experienceTable: ExperienceStep[];
  educationRules: EducationRule[];
  tiers?: Tier[]; // overrides the configured thresholds when present
};

export type PostContext = { title: string; organisation: string };

export type CriterionResult = { key: CriterionKey; score: number; weight: number; points: number; notes: string[] };
export type Flag = { code: string; severity: "info" | "warn" | "high"; message: string };
export type KnockoutFailure = { type: Knockout["type"]; message: string };

export type EvaluationResult = {
  eligible: boolean;
  knockouts: KnockoutFailure[];
  total: number | null; // 0..100, null when the candidate is ineligible
  tier: string | null;
  breakdown: CriterionResult[];
  flags: Flag[];
};
