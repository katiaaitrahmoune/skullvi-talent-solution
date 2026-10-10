// Shapes returned by the backend (/api/staff/*). Mirrors backend/src/domain/types.ts.
export type Role = "admin" | "reviewer";
export type Me = { id: string; email: string; name: string; role: Role };
export type PostStatus = "draft" | "open" | "closed";
export type AppStatus = "validated" | "ineligible" | "scored" | "in_review" | "shortlisted" | "declined";
export type CriterionKey = "skills" | "projects" | "motivation" | "experience" | "education" | "profile";
export type EducationLevel = "bac" | "bac2" | "licence" | "master" | "doctorate";

export type Knockout =
  | { type: "min_education"; level: EducationLevel }
  | { type: "required_skills"; skills: string[]; mode: "all" | "any" }
  | { type: "language"; language: string }
  | { type: "country_in"; countries: string[] };

export type Rubric = {
  weights: Record<CriterionKey, number>;
  skills: { required: string[]; preferred: string[] };
  knockouts: Knockout[];
  experienceTable: { minMonths: number; points: number }[];
  educationRules: { pattern: string; level: EducationLevel; points: number }[];
  tiers?: { tier: string; min: number }[];
};

export type PostSummary = {
  id: string; title: string; status: PostStatus; type: string; mode: string; deadline: string; rubricVersion: number;
  counts: { applications: number; ongoing: number; shortlisted: number; ineligible: number };
};

export type StaffPost = {
  id: string; title: string; organisation: string; summary: string; description: string; type: string; mode: string; location: string;
  deadline: string; startDate: string; infoSession: string; seats: number; minEducation: string; languages: string;
  missions: string[]; mustHave: string[]; niceToHave: string[]; status: PostStatus; autoQueue: boolean; rubricVersion: number;
  rubric: Rubric; reviewers: { id: string; name: string; email: string }[];
};

export type Flag = { code: string; severity: "info" | "warn" | "high"; message: string };
export type Criterion = { key: CriterionKey; score: number; weight: number; points: number; notes: string[] };

export type RankedRow = {
  rank: number | null; id: string; reference: string; status: AppStatus; source: string; returningCandidate: boolean; submittedAt: string;
  candidate: { firstName: string; lastName: string; email: string; country: string; city: string };
  total: number | null; adjustment: number; effective: number | null; tier: string | null; flags: Flag[];
  rubricVersion: number | null; stale: boolean; noteCount: number;
};
export type Ranking = { total: number; rows: RankedRow[] };

export type CandidateData = {
  firstName: string; lastName: string; email: string; phone: string; country: string; city: string; cvName: string;
  education: { degree: string; institution: string; startDate: string; ongoing: boolean; endDate: string; fileName: string }[];
  experience: { role: string; company: string; startDate: string; ongoing: boolean; endDate: string; description: string }[];
  certificates: { name: string; issuer: string; date: string; url: string; fileName: string }[];
  skills: string[]; github: string; portfolio: string; linkedin: string;
  projectTitle: string; projectLink: string; projectProud: string; projectChallenge: string; projectSolution: string;
  availability: string; workMode: string; relocation: string; languages: string; expectations: string; heardFrom: string; coverLetter: string;
};

export type ApplicationDetail = {
  id: string; reference: string; status: AppStatus; source: string; returningCandidate: boolean; submittedAt: string;
  post: { id: string; title: string };
  candidate: { firstName: string; lastName: string; email: string; phone: string; country: string; city: string };
  data: CandidateData;
  files: { field: string; name: string; size: number }[];
  evaluation: null | {
    rubricVersion: number; currentRubricVersion: number; stale: boolean; eligible: boolean;
    knockouts: { type: string; message: string }[]; total: number | null; tier: string | null; breakdown: Criterion[]; flags: Flag[]; at: string;
  };
  adjustment: { delta: number; reason: string } | null;
  effectiveScore: number | null;
  notes: { id: string; body: string; created_at: string; author: string }[];
  adjustments: { delta: number; reason: string; created_at: string; author: string }[];
  evaluations: { seq: string; rubric_version: number; total: number | null; tier: string | null; created_at: string }[];
  audit: { at: string; actor_label: string; action: string; details: Record<string, unknown> }[];
  allowedEvents: string[];
  decision: { at: string; note: string | null } | null;
};

export type AiRun = {
  id: string; postId: string; source: "ai" | "fallback"; fallbackReason: string | null; model: string | null; createdAt: string;
  confirmed: { at: string; order: string[] } | null;
  top3: { rank: number; applicationId: string; reference?: string; status?: string; name: string | null; score: number | null; tier: string | null; strengths: string[]; risks: string[]; questions: string[] }[];
};

export type StaffUser = { id: string; email: string; name: string; role: Role; active: boolean };
export type ImportReport = { total: number; accepted: number; rejected: number; report: { row: number; email: string; outcome: string; reference?: string; status?: string; errors?: Record<string, string> }[] };
