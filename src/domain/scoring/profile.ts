import { isHttpUrl } from "./projects.ts";
import type { CriterionFn } from "./types.ts";

// PROFILE - field ratio: how many of the optional-but-useful fields are filled in.
export const scoreProfile: CriterionFn = ({ data }) => {
  const fields: [string, boolean][] = [
    ["téléphone", data.phone.trim().length >= 8],
    ["LinkedIn", isHttpUrl(data.linkedin)],
    ["GitHub", isHttpUrl(data.github)],
    ["portfolio", isHttpUrl(data.portfolio)],
    ["CV", data.cvName.trim().length > 0],
    ["certificats", data.certificates.length > 0],
    ["attentes", data.expectations.trim().length > 0],
    ["langues", data.languages.trim().length > 0],
  ];
  const filled = fields.filter(([, ok]) => ok);
  const missing = fields.filter(([, ok]) => !ok).map(([n]) => n);
  return { score: filled.length / fields.length, notes: [`${filled.length}/${fields.length} champs renseignés${missing.length ? `, manquants : ${missing.join(", ")}` : ""}.`] };
};
