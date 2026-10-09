// Text helpers shared by scoring, eligibility and anonymization. Accent- and case-insensitive.

export const fold = (s: string): string =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const ALIASES: Record<string, string> = {
  nodejs: "node.js", node: "node.js", "node js": "node.js",
  reactjs: "react", "react.js": "react", "react js": "react",
  js: "javascript", ts: "typescript", py: "python",
  postgres: "postgresql", nextjs: "next.js", "next js": "next.js",
  vuejs: "vue", "vue.js": "vue", csharp: "c#", "c sharp": "c#", golang: "go",
};

export const canonSkill = (s: string): string => {
  const f = fold(s);
  return ALIASES[f] ?? f;
};

/** The canonical term plus every alias that maps to it ("javascript" -> ["javascript", "js"]). */
export function variantsOf(canon: string): string[] {
  const out = [canon];
  for (const [alias, c] of Object.entries(ALIASES)) if (c === canon) out.push(alias);
  return out;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-term match on folded text: "java" does not match "javascript"; "c++" and "node.js" work. */
export function containsTerm(foldedText: string, term: string): boolean {
  if (!term) return false;
  return new RegExp(`(?<![a-z0-9])${esc(term)}(?![a-z0-9])`).test(foldedText);
}

export const tokens = (s: string): string[] => fold(s).match(/[a-z0-9]+/g) ?? [];

export function sentences(s: string): string[] {
  return s.split(/[.!?…]+(?:\s+|$)|\n+/).map((x) => x.trim()).filter((x) => x.length >= 3);
}

export const STOPWORDS = new Set(
  "le la les un une des de du et en a au aux ce ces cette pour par sur dans avec sans que qui est sont je tu il elle nous vous ils elles mon ma mes ton ta tes son sa ses notre votre leur leurs the an of and to in for on with is are i you we they my your our programme offre poste".split(" "),
);

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
export const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
export const unique = <T>(xs: T[]) => [...new Set(xs)];

// ---- redaction (used before anything is sent to the AI model) ----

/** Remove direct identifiers from free text: e-mails, URLs, @handles, phone numbers and the candidate's own name. */
export function redactText(text: string, names: string[]): string {
  const nameSet = new Set(names.flatMap((n) => n.split(/[\s'-]+/)).map(fold).filter((n) => n.length >= 2));
  return text
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[email]")
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[lien]")
    .replace(/(?<!\w)@[\w.]{2,}/g, "[pseudo]")
    .replace(/(?<!\d)\+?\d[\d ().-]{6,}\d(?!\d)/g, "[tel]")
    .replace(/\p{L}+/gu, (w) => (nameSet.has(fold(w)) ? "[nom]" : w));
}
