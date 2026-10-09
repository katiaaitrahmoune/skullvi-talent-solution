import type { DateRange } from "./types.ts";

/** "2025-06" (or "2025-06-14") -> months since year 0, or null when malformed. */
export function parseMonth(s: string): number | null {
  const m = /^(\d{4})-(\d{2})/.exec(s ?? "");
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return Number(m[1]) * 12 + (month - 1);
}

/** Total months covered by the ranges, counting overlaps once and both end months. Ongoing ranges end at `now`. */
export function totalMonths(ranges: DateRange[], now: Date): number {
  const nowIdx = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const spans: [number, number][] = [];
  for (const r of ranges) {
    const start = parseMonth(r.startDate);
    const end = r.ongoing ? nowIdx : parseMonth(r.endDate);
    if (start === null || end === null) continue;
    const e = Math.min(end, nowIdx);
    if (e >= start) spans.push([start, e]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let cur: [number, number] | null = null;
  for (const s of spans) {
    if (!cur || s[0] > cur[1]) {
      if (cur) total += cur[1] - cur[0] + 1;
      cur = [s[0], s[1]];
    } else cur[1] = Math.max(cur[1], s[1]);
  }
  if (cur) total += cur[1] - cur[0] + 1;
  return total;
}
