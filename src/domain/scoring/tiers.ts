import { DEFAULT_TIERS } from "../defaults.ts";
import type { Rubric, Tier } from "../types.ts";

export const tiersOf = (rubric: Rubric, configured?: Tier[]): Tier[] =>
  [...(rubric.tiers ?? configured ?? DEFAULT_TIERS)].sort((a, b) => b.min - a.min);

/** "Assign tier": first tier (highest threshold first) the score reaches. */
export function assignTier(total: number, tiers: Tier[]): string {
  const sorted = [...tiers].sort((a, b) => b.min - a.min);
  return (sorted.find((t) => total >= t.min) ?? sorted[sorted.length - 1]).tier;
}
