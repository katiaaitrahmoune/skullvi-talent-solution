// "Normalize input: trim, lowercase email" (activity diagram). Runs BEFORE validation.

const dedupe = (xs: unknown[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    if (typeof x !== "string") continue;
    const t = x.trim();
    const k = t.toLowerCase();
    if (t && !seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out;
};

export function normalizeInput(raw: unknown): unknown {
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw)) return raw.map(normalizeInput);
  if (raw && typeof raw === "object") {
    const out: Record<string, unknown> = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, normalizeInput(v)]));
    if (typeof out.email === "string") out.email = out.email.toLowerCase();
    if (Array.isArray(out.skills)) out.skills = dedupe(out.skills);
    return out;
  }
  return raw;
}
