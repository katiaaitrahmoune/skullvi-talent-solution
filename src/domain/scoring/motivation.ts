import { canonSkill, clamp01, containsTerm, fold, sentences, STOPWORDS, tokens, unique } from "../text.ts";
import type { CriterionFn } from "./types.ts";

// MOTIVATION - text quality of the cover letter (transparent heuristics, not an AI judgement):
//   length 30 %, vocabulary diversity 25 %, structure 20 %, relevance to the post 25 %.
export const scoreMotivation: CriterionFn = ({ data, post, rubric }) => {
  const text = data.coverLetter.trim();
  const words = tokens(text).filter((w) => w.length >= 3);
  const notes: string[] = [];

  const length = clamp01((text.length - 100) / 800);
  const diversity = words.length ? clamp01((new Set(words).size / words.length - 0.4) / 0.3) : 0;
  const sents = sentences(text);
  const avgLen = sents.length ? words.length / sents.length : 0;
  const structure = clamp01(sents.length / 4) * (avgLen >= 6 && avgLen <= 35 ? 1 : 0.6);

  const folded = fold(text);
  const terms = unique([...tokens(post.title).filter((w) => w.length >= 4 && !STOPWORDS.has(w)), ...[...rubric.skills.required, ...rubric.skills.preferred].map(canonSkill)]);
  const matched = terms.filter((t) => containsTerm(folded, t)).length;
  const relevance = terms.length ? clamp01(matched / Math.min(terms.length, 4)) : 0.5;

  notes.push(`${text.length} caractères, ${sents.length} phrase(s), diversité du vocabulaire ${Math.round(diversity * 100)} %.`);
  notes.push(terms.length ? `Lien avec l'offre : ${matched} terme(s) de l'offre repris.` : "Aucun terme de référence pour mesurer le lien avec l'offre.");
  return { score: clamp01(0.3 * length + 0.25 * diversity + 0.2 * structure + 0.25 * relevance), notes };
};
