// All user-facing wizard text lives here (French, like skullvi.org).
export const STEPS = [
  { id: "cv", label: "CV", title: "Votre CV et vos informations", desc: "Importez votre CV pour pré-remplir le formulaire, ou saisissez tout manuellement." },
  { id: "education", label: "Formation", title: "Votre formation", desc: "Ajoutez chaque diplôme ou cursus, en cours ou terminé, avec ses justificatifs." },
  { id: "experience", label: "Expérience", title: "Expérience et certificats", desc: "Stages, emplois, bénévolat, freelance, formations en ligne : tout compte. Cette étape est facultative." },
  { id: "skills", label: "Compétences", title: "Vos compétences", desc: "Ajoutez vos compétences techniques et vos liens professionnels." },
  { id: "project", label: "Projet", title: "Votre projet le plus marquant", desc: "Racontez-nous un projet dont vous êtes fier, une difficulté rencontrée et comment vous l'avez résolue." },
  { id: "questions", label: "Questions", title: "Questions générales", desc: "Les questions que nous posons à tous les candidats." },
  { id: "cover", label: "Lettre", title: "Lettre de motivation", desc: "Dites-nous pourquoi vous voulez rejoindre cette offre." },
  { id: "summary", label: "Récapitulatif", title: "Vérifiez votre candidature", desc: "Relisez avant d'envoyer. Chaque section reste modifiable." },
  { id: "receipt", label: "Confirmation", title: "Candidature envoyée", desc: "Merci. Conservez votre référence." },
] as const;

export type StepId = (typeof STEPS)[number]["id"];
