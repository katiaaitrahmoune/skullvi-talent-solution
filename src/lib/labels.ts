import type { AppStatus, CriterionKey, PostStatus } from "./admin-types";

export const CRITERION_LABEL: Record<CriterionKey, string> = {
  skills: "Compétences", projects: "Projets", motivation: "Motivation", experience: "Expérience", education: "Formation", profile: "Profil",
};
export const CRITERION_HINT: Record<CriterionKey, string> = {
  skills: "Mots-clés de l'offre trouvés dans les compétences et le projet",
  projects: "Liens valides et qualité de la description du projet",
  motivation: "Qualité de la lettre : longueur, vocabulaire, structure, lien avec l'offre",
  experience: "Mois d'expérience cumulés, convertis en points par paliers",
  education: "Meilleure formation reconnue par la table de règles",
  profile: "Part des champs utiles renseignés (liens, CV, certificats…)",
};
export const CRITERIA: CriterionKey[] = ["skills", "projects", "motivation", "experience", "education", "profile"];

export const APP_STATUS: Record<AppStatus, { label: string; cls: string }> = {
  validated: { label: "Validée", cls: "bg-night-btn/10 text-ink" },
  scored: { label: "Notée", cls: "bg-blue-500/15 text-blue-500" },
  in_review: { label: "En revue", cls: "bg-accent-400/20 text-brand-900" },
  shortlisted: { label: "Présélectionnée", cls: "bg-green-500/15 text-green-600" },
  declined: { label: "Refusée", cls: "bg-brand-500/10 text-brand-700" },
  ineligible: { label: "Non éligible", cls: "bg-night-btn/10 text-muted" },
};
export const POST_STATUS: Record<PostStatus, { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "bg-night-btn/10 text-ink" },
  open: { label: "Publiée", cls: "bg-green-500/15 text-green-600" },
  closed: { label: "Clôturée", cls: "bg-brand-500/10 text-brand-700" },
};
export const TIER_CLS: Record<string, string> = {
  A: "bg-green-500 text-white", B: "bg-blue-500 text-white", C: "bg-accent-400 text-ink", D: "bg-night-btn/15 text-ink",
};
export const SEVERITY_DOT = { info: "bg-night-muted", warn: "bg-accent-500", high: "bg-brand-500" } as const;
export const EDUCATION_LEVELS = [["bac", "Baccalauréat"], ["bac2", "Bac+2"], ["licence", "Licence"], ["master", "Master"], ["doctorate", "Doctorat"]] as const;

export const AI_REASON: Record<string, string> = {
  no_api_key: "aucune clé IA configurée",
  timeout: "le modèle n'a pas répondu à temps",
};
export const aiReason = (r: string | null) => (r ? AI_REASON[r] ?? (r.startsWith("invalid_output") ? "réponse du modèle invalide" : "erreur du modèle") : "");

export const AUDIT_LABEL: Record<string, string> = {
  "application.received": "Candidature reçue", "application.eligible": "Éligible, notée", "application.knockout_failed": "Non éligible",
  "application.queued": "Envoyée en revue", "application.rubric_change": "Re-notée (nouvelle grille)", "application.accept": "Présélectionnée", "application.decline": "Refusée",
  "note.added": "Note ajoutée", "score.adjusted": "Score ajusté",
};

// Reviewer vocabulary: "shortlisted" means "goes to interview".
export const REVIEWER_STATUS = {
  in_review: { label: "À examiner", cls: "bg-accent-400/20 text-brand-900" },
  shortlisted: { label: "Retenu pour entretien", cls: "bg-green-500/15 text-green-600" },
  declined: { label: "Non retenu", cls: "bg-brand-500/10 text-brand-700" },
  scored: { label: "En attente", cls: "bg-night-btn/10 text-ink" },
  validated: { label: "En attente", cls: "bg-night-btn/10 text-ink" },
  ineligible: { label: "Non éligible", cls: "bg-night-btn/10 text-muted" },
} as const;
