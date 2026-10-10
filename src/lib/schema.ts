import { z } from "zod";

const optionalUrl = z.string().trim().url("Lien invalide. Exemple : https://github.com/votre-nom").or(z.literal(""));
const anyFile = z.any() as z.ZodType<File | null | undefined>;

export const personalSchema = z.object({
  firstName: z.string().trim().min(2, "Entrez votre prénom"),
  lastName: z.string().trim().min(2, "Entrez votre nom"),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide"),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{8,18}$/, "Numéro invalide. Exemple : +213 555 12 34 56"),
  country: z.string().min(1, "Choisissez votre pays"),
  city: z.string().trim().min(2, "Entrez votre ville"),
});

// Shared by education and experience: a start month and either an end month or "ongoing".
const monthRange = (v: { startDate: string; ongoing: boolean; endDate: string }, ctx: z.RefinementCtx) => {
  if (v.ongoing) return;
  if (!v.endDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "Date de fin requise, ou cochez « En cours »" });
  else if (v.startDate && v.endDate < v.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "La fin doit être après le début" });
};

const educationItem = z
  .object({
    degree: z.string().trim().min(2, "Indiquez le diplôme ou la filière"),
    institution: z.string().trim().min(2, "Indiquez l'établissement"),
    startDate: z.string().min(1, "Date de début requise"),
    ongoing: z.boolean(),
    endDate: z.string(),
    file: anyFile,
  })
  .superRefine(monthRange);

export const educationSchema = z.object({ education: z.array(educationItem).min(1, "Ajoutez au moins une formation") });

// Work experience is optional (internships, volunteering and freelance count). If an entry exists, it must be complete.
const experienceItem = z
  .object({
    role: z.string().trim().min(2, "Indiquez votre poste ou rôle"),
    company: z.string().trim().min(2, "Indiquez l'organisation"),
    startDate: z.string().min(1, "Date de début requise"),
    ongoing: z.boolean(),
    endDate: z.string(),
    description: z.string().trim().max(400, "400 caractères maximum"),
  })
  .superRefine(monthRange);

export const experienceSchema = z.object({
  experience: z.array(experienceItem).max(10, "10 expériences maximum"),
});

// Certificates are optional too.
const certificateItem = z.object({
  name: z.string().trim().min(2, "Indiquez le nom du certificat"),
  issuer: z.string().trim().min(2, "Indiquez l'organisme"),
  date: z.string().min(1, "Date d'obtention requise"),
  url: optionalUrl,
  file: anyFile,
});

export const certificatesSchema = z.object({
  certificates: z.array(certificateItem).max(10, "10 certificats maximum"),
});

export const skillsSchema = z.object({
  skills: z.array(z.string()).min(1, "Ajoutez au moins une compétence").max(15, "15 compétences maximum"),
  github: optionalUrl,
  portfolio: optionalUrl,
  linkedin: optionalUrl,
});

// The project story: what, a real difficulty, how it was solved.
export const projectSchema = z.object({
  projectTitle: z.string().trim().min(3, "Donnez un titre à votre projet"),
  projectLink: optionalUrl,
  projectProud: z.string().trim().min(80, "Décrivez votre projet en au moins 80 caractères").max(800, "800 caractères maximum"),
  projectChallenge: z.string().trim().min(60, "Décrivez la difficulté en au moins 60 caractères").max(600, "600 caractères maximum"),
  projectSolution: z.string().trim().min(60, "Décrivez la solution en au moins 60 caractères").max(600, "600 caractères maximum"),
});

export const questionsSchema = z.object({
  availability: z.string().min(1, "Choisissez une réponse"),
  workMode: z.string().min(1, "Choisissez une réponse"),
  relocation: z.string().min(1, "Choisissez une réponse"),
  languages: z.string().trim().min(2, "Indiquez les langues que vous parlez"),
  expectations: z.string().trim().max(500, "500 caractères maximum"),
  heardFrom: z.string().min(1, "Choisissez une réponse"),
});

export const coverSchema = z.object({
  coverLetter: z.string().trim().min(150, "Votre lettre doit faire au moins 150 caractères").max(2500, "2500 caractères maximum"),
  consent: z.boolean().refine((v) => v === true, "Votre accord est nécessaire pour envoyer la candidature"),
});

export const cvSchema = z.object({ cvMode: z.enum(["upload", "manual"]), cvFile: anyFile });

export const fullSchema = cvSchema.merge(personalSchema).merge(educationSchema).merge(experienceSchema).merge(certificatesSchema).merge(skillsSchema).merge(projectSchema).merge(questionsSchema).merge(coverSchema);
export type ApplicationValues = z.infer<typeof fullSchema>;
export type FieldName = keyof ApplicationValues;

// Fields each wizard step validates before moving on.
// ORDER MUST MATCH the first steps in STEPS (src/lib/copy.ts).
export const STEP_FIELDS: FieldName[][] = [
  Object.keys(personalSchema.shape) as FieldName[],
  ["education"],
  ["experience", "certificates"],
  Object.keys(skillsSchema.shape) as FieldName[],
  Object.keys(projectSchema.shape) as FieldName[],
  Object.keys(questionsSchema.shape) as FieldName[],
  Object.keys(coverSchema.shape) as FieldName[],
];

export const EMPTY_EDUCATION = { degree: "", institution: "", startDate: "", ongoing: false, endDate: "", file: null };

export const EMPTY_EXPERIENCE = { role: "", company: "", startDate: "", ongoing: false, endDate: "", description: "" };
export const EMPTY_CERTIFICATE = { name: "", issuer: "", date: "", url: "", file: null };

export const DEFAULT_VALUES: ApplicationValues = {
  cvMode: "upload", cvFile: null,
  firstName: "", lastName: "", email: "", phone: "", country: "", city: "",
  education: [EMPTY_EDUCATION],
  experience: [], certificates: [],
  skills: [], github: "", portfolio: "", linkedin: "",
  projectTitle: "", projectLink: "", projectProud: "", projectChallenge: "", projectSolution: "",
  availability: "", workMode: "", relocation: "", languages: "", expectations: "", heardFrom: "",
  coverLetter: "", consent: false,
};
