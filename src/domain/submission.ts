// "Run validators: required, email, links" - same rules as the web form (src/lib/schema.ts in the frontend).
import { z } from "zod";
import type { CandidateData } from "./types.ts";

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/, "Date invalide (AAAA-MM)");
const optionalUrl = z.string().max(300).url("Lien invalide. Exemple : https://github.com/votre-nom").or(z.literal(""));
const fileName = z.string().max(200).default("");

const range = (v: { startDate: string; ongoing: boolean; endDate: string }, ctx: z.RefinementCtx) => {
  if (v.ongoing) return;
  if (!/^\d{4}-(0[1-9]|1[0-2])/.test(v.endDate)) ctx.addIssue({ code: "custom", path: ["endDate"], message: "Date de fin requise, ou cochez « En cours »" });
  else if (v.endDate < v.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "La fin doit être après le début" });
};

const education = z.object({
  degree: z.string().min(2, "Indiquez le diplôme ou la filière").max(150),
  institution: z.string().min(2, "Indiquez l'établissement").max(150),
  startDate: month, ongoing: z.boolean(), endDate: z.string().max(10), fileName,
}).superRefine(range);

const experience = z.object({
  role: z.string().min(2, "Indiquez votre poste ou rôle").max(150),
  company: z.string().min(2, "Indiquez l'organisation").max(150),
  startDate: month, ongoing: z.boolean(), endDate: z.string().max(10),
  description: z.string().max(400, "400 caractères maximum"),
}).superRefine(range);

const certificate = z.object({
  name: z.string().min(2, "Indiquez le nom du certificat").max(150),
  issuer: z.string().min(2, "Indiquez l'organisme").max(150),
  date: month, url: optionalUrl, fileName,
});

export const submissionSchema = z.object({
  postId: z.string().uuid("Offre invalide").optional(), // required by the HTTP route, absent for CSV rows
  cvFileName: fileName,
  firstName: z.string().min(2, "Entrez votre prénom").max(80),
  lastName: z.string().min(2, "Entrez votre nom").max(80),
  email: z.string().email("Adresse e-mail invalide").max(200),
  phone: z.string().regex(/^\+?[0-9 ()-]{8,18}$/, "Numéro invalide. Exemple : +213 555 12 34 56"),
  country: z.string().min(1, "Choisissez votre pays").max(60),
  city: z.string().min(2, "Entrez votre ville").max(80),
  education: z.array(education).min(1, "Ajoutez au moins une formation").max(10),
  experience: z.array(experience).max(10, "10 expériences maximum"),
  certificates: z.array(certificate).max(10, "10 certificats maximum"),
  skills: z.array(z.string().min(1).max(40)).min(1, "Ajoutez au moins une compétence").max(15, "15 compétences maximum"),
  github: optionalUrl, portfolio: optionalUrl, linkedin: optionalUrl,
  projectTitle: z.string().min(3, "Donnez un titre à votre projet").max(150),
  projectLink: optionalUrl,
  projectProud: z.string().min(80, "Décrivez votre projet en au moins 80 caractères").max(800),
  projectChallenge: z.string().min(60, "Décrivez la difficulté en au moins 60 caractères").max(600),
  projectSolution: z.string().min(60, "Décrivez la solution en au moins 60 caractères").max(600),
  availability: z.string().min(1, "Choisissez une réponse").max(60),
  workMode: z.string().min(1, "Choisissez une réponse").max(60),
  relocation: z.string().min(1, "Choisissez une réponse").max(60),
  languages: z.string().min(2, "Indiquez les langues que vous parlez").max(200),
  expectations: z.string().max(500, "500 caractères maximum"),
  heardFrom: z.string().min(1, "Choisissez une réponse").max(60),
  coverLetter: z.string().min(150, "Votre lettre doit faire au moins 150 caractères").max(2500),
  consent: z.literal(true, { errorMap: () => ({ message: "Votre accord est nécessaire pour envoyer la candidature" }) }),
});
export type Submission = z.infer<typeof submissionSchema>;

export function toCandidateData(s: Submission): CandidateData {
  const { postId: _p, consent: _c, cvFileName, ...rest } = s;
  return { ...rest, cvName: cvFileName };
}

/** First message per field path, e.g. { "education.0.degree": "..." }. */
export function flattenIssues(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[i.path.join(".") || "form"] ??= i.message;
  return out;
}
