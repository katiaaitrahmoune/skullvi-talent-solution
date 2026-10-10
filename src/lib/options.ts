export type Option = { value: string; label: string };
const o = (list: string[]): Option[] => list.map((c) => ({ value: c, label: c }));

export const COUNTRIES = o(["Algérie", "Bénin", "Belgique", "Cameroun", "Côte d'Ivoire", "France", "Maroc", "Sénégal", "Togo", "Tunisie", "Autre"]);
export const AVAILABILITY = o(["Immédiatement", "Sous 1 mois", "Dans 2 à 3 mois", "Plus tard"]);
export const WORK_MODE = o(["À distance", "Hybride", "Sur site"]);
export const YES_NO = o(["Oui", "Non"]);
export const HEARD = o(["Site SKULLVI", "LinkedIn", "Réseaux sociaux", "Université / école", "Ami ou connaissance", "Autre"]);

export const SKILL_SUGGESTIONS = ["Python", "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "SQL", "FastAPI", "Git", "Docker", "UI/UX"];
// Used by the CV extractor to spot skills in free text.
export const SKILL_BANK = [...SKILL_SUGGESTIONS, "Java", "C++", "C#", "PHP", "Laravel", "Django", "Flask", "Express", "Vue", "Angular", "PostgreSQL", "MySQL", "MongoDB", "Linux", "AWS", "Azure", "Kubernetes", "Figma", "Excel", "Power BI", "Machine Learning", "Flutter", "Kotlin", "Swift", "Tailwind", "GraphQL"];

export const labelOf = (options: Option[], value: string) => options.find((x) => x.value === value)?.label ?? value;
