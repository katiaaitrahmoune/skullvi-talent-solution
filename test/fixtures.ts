import { defaultRubric } from "../src/domain/defaults.ts";
import type { CandidateData, Rubric } from "../src/domain/types.ts";

export const NOW = new Date("2026-10-01T00:00:00Z");

export const strong: CandidateData = {
  firstName: "Yawo", lastName: "Agbeko", email: "yawo@example.org", phone: "+228 90 00 00 00", country: "Togo", city: "Lomé",
  cvName: "cv.pdf",
  education: [{ degree: "Licence en informatique", institution: "Université de Lomé", startDate: "2022-10", ongoing: false, endDate: "2025-07", fileName: "" }],
  experience: [{ role: "Stagiaire développeur", company: "Agence Web", startDate: "2025-06", ongoing: false, endDate: "2025-12", description: "API Node.js et base PostgreSQL." }],
  certificates: [{ name: "JavaScript Algorithms", issuer: "freeCodeCamp", date: "2025-03", url: "", fileName: "" }],
  skills: ["JavaScript", "React", "Git", "SQL"], github: "https://github.com/yawo", portfolio: "https://yawo.dev", linkedin: "https://linkedin.com/in/yawo",
  projectTitle: "Suivi des notes", projectLink: "https://github.com/yawo/notes",
  projectProud: "Une application web qui permet aux élèves de suivre leurs notes et leurs progrès. J'ai conçu l'interface, la base de données et l'API, utilisée par une trentaine de camarades du lycée.",
  projectChallenge: "Les moyennes étaient fausses quand une matière n'avait pas de coefficient, il a fallu reprendre tout le modèle de données.",
  projectSolution: "J'ai ajouté une table de coefficients avec valeur par défaut, écrit des tests sur les cas limites puis migré les anciennes données.",
  availability: "Immédiatement", workMode: "À distance", relocation: "Non", languages: "Français, anglais", expectations: "Apprendre auprès de tuteurs.", heardFrom: "Site SKULLVI",
  coverLetter:
    "Je suis passionné par l'apprentissage en ligne en Afrique francophone. Ce programme développeurs représente pour moi l'occasion de progresser avec des tuteurs expérimentés tout en construisant des fonctionnalités réellement utilisées par des élèves. J'ai déjà travaillé avec JavaScript et React sur un projet concret et je souhaite approfondir mes connaissances en SQL. Je m'engage à consacrer le temps nécessaire au programme et à partager ce que j'apprends avec ma communauté.",
};

export const weak: CandidateData = {
  ...strong, firstName: "Grace", lastName: "Nkemelu", email: "grace@example.org", cvName: "", phone: "", country: "Cameroun",
  education: [{ degree: "Formation en bureautique", institution: "Centre", startDate: "2024-01", ongoing: false, endDate: "2024-06", fileName: "" }],
  experience: [], certificates: [], skills: ["Excel"], github: "", portfolio: "", linkedin: "", projectLink: "",
  projectProud: "Un site.", projectChallenge: "Lent.", projectSolution: "Images.", languages: "Français", expectations: "",
  coverLetter: "Je veux apprendre. Je suis motivé. Je veux apprendre. Je suis motivé.",
};

export const post = { title: "Programme développeurs SKULLVI", organisation: "SKULLVI" };

export const rubric = (): Rubric => defaultRubric({ required: ["JavaScript", "Git", "SQL"], preferred: ["React", "Python", "TypeScript"] });
