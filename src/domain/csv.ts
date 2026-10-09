// CSV upload -> the same submission shape the web form produces, so both go through ONE pipeline.

export const CSV_COLUMNS = [
  "first_name", "last_name", "email", "phone", "country", "city", "skills", "github", "portfolio", "linkedin",
  "education", "experience", "certificates",
  "project_title", "project_link", "project_proud", "project_challenge", "project_solution",
  "availability", "work_mode", "relocation", "languages", "expectations", "heard_from", "cover_letter",
] as const;

export class CsvFormatError extends Error {}

const RANGE_END = /^(\d{4}-\d{2})$/;

function parseRange(text: string, label: string): { startDate: string; endDate: string; ongoing: boolean } {
  const m = /^(\d{4}-\d{2})\.\.(.*)$/.exec(text.trim());
  if (!m) throw new CsvFormatError(`${label} : période invalide « ${text} » (attendu 2023-10..2025-06 ou 2023-10..)`);
  const end = m[2].trim().toLowerCase();
  if (!end || end === "present" || end === "en cours") return { startDate: m[1], endDate: "", ongoing: true };
  if (!RANGE_END.test(end)) throw new CsvFormatError(`${label} : date de fin invalide « ${m[2]} »`);
  return { startDate: m[1], endDate: end, ongoing: false };
}

/** "Licence info@Université de Lomé:2023-10..|BAC@Lycée:2020-09..2023-06" */
export function parseEducation(cell: string) {
  return split(cell).map((item) => {
    const m = /^(.*?)@(.*?):(\d{4}-\d{2}\.\..*)$/.exec(item);
    if (!m) throw new CsvFormatError(`formation : format invalide « ${item} » (attendu diplôme@établissement:2023-10..2025-06)`);
    return { degree: m[1].trim(), institution: m[2].trim(), ...parseRange(m[3], "formation"), fileName: "" };
  });
}

/** "Stagiaire@Agence Web:2025-06..2025-09" */
export function parseExperience(cell: string) {
  return split(cell).map((item) => {
    const m = /^(.*?)@(.*?):(\d{4}-\d{2}\.\..*)$/.exec(item);
    if (!m) throw new CsvFormatError(`expérience : format invalide « ${item} » (attendu poste@organisation:2025-06..2025-09)`);
    return { role: m[1].trim(), company: m[2].trim(), description: "", ...parseRange(m[3], "expérience") };
  });
}

/** "JavaScript Algorithms@freeCodeCamp:2025-03" */
export function parseCertificates(cell: string) {
  return split(cell).map((item) => {
    const m = /^(.*?)@(.*?):(\d{4}-\d{2})$/.exec(item);
    if (!m) throw new CsvFormatError(`certificat : format invalide « ${item} » (attendu nom@organisme:2025-03)`);
    return { name: m[1].trim(), issuer: m[2].trim(), date: m[3], url: "", fileName: "" };
  });
}

const split = (cell: string) => (cell ?? "").split("|").map((s) => s.trim()).filter(Boolean);
const list = (cell: string) => (cell ?? "").split(/[;,]/).map((s) => s.trim()).filter(Boolean);

/** One CSV row -> raw submission (to be normalized and validated like any web submission). */
export function rowToSubmission(row: Record<string, string>): Record<string, unknown> {
  const g = (k: string) => (row[k] ?? "").trim();
  return {
    cvMode: "manual",
    firstName: g("first_name"), lastName: g("last_name"), email: g("email"), phone: g("phone"), country: g("country"), city: g("city"),
    education: parseEducation(g("education")),
    experience: parseExperience(g("experience")),
    certificates: parseCertificates(g("certificates")),
    skills: list(g("skills")), github: g("github"), portfolio: g("portfolio"), linkedin: g("linkedin"),
    projectTitle: g("project_title"), projectLink: g("project_link"), projectProud: g("project_proud"),
    projectChallenge: g("project_challenge"), projectSolution: g("project_solution"),
    availability: g("availability"), workMode: g("work_mode"), relocation: g("relocation"),
    languages: g("languages"), expectations: g("expectations"), heardFrom: g("heard_from"),
    coverLetter: g("cover_letter"),
    consent: true, // the admin attests consent when uploading (see POST /staff/imports)
  };
}

/** Spreadsheet-injection guard: a TEXT cell starting with = + - @ would be run as a formula by Excel. */
export const safeCell = (v: unknown): string | number => {
  if (typeof v === "number") return v;
  const s = v === null || v === undefined ? "" : String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};
