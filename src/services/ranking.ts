import { z } from "zod";
import { pool } from "../db/pool.ts";
import type { Flag } from "../domain/types.ts";

export const rankingQuerySchema = z.object({
  status: z.string().optional(), // comma separated, e.g. in_review,shortlisted
  tier: z.string().max(10).optional(),
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type RankingQuery = z.infer<typeof rankingQuerySchema>;

const STATUSES = ["validated", "ineligible", "scored", "in_review", "shortlisted", "declined"];

// Shared by the ranked list, the CSV export and the AI selection: latest evaluation + latest reviewer adjustment per application.
export const SCORED_CTE = `
  latest as (select distinct on (application_id) * from evaluations order by application_id, seq desc),
  adj as (select distinct on (application_id) application_id, delta, reason from score_adjustments order by application_id, seq desc)`;

export type RankedRow = {
  rank: number | null; id: string; reference: string; status: string; source: string; returningCandidate: boolean; submittedAt: string;
  candidate: { firstName: string; lastName: string; email: string; country: string; city: string };
  total: number | null; adjustment: number; effective: number | null; tier: string | null; flags: Flag[];
  rubricVersion: number | null; stale: boolean; noteCount: number;
};

/** "Update ranking: sort by total score". Computed at read time, so it is always current. Ineligible candidates are listed last, unranked. */
export async function ranking(postId: string, q: RankingQuery): Promise<{ total: number; rows: RankedRow[] }> {
  const statuses = (q.status?.split(",").map((s) => s.trim()).filter((s) => STATUSES.includes(s))) ?? [];
  const r = await pool.query(
    `with ${SCORED_CTE},
     ranked as (
       select a.id, a.reference, a.status, a.source, a.returning_candidate, a.created_at,
         c.first_name, c.last_name, c.email, c.country, c.city,
         l.total::float8 as total, l.tier, coalesce(l.flags, '[]'::jsonb) as flags, l.rubric_version,
         coalesce(j.delta, 0) as adjustment,
         case when l.total is null then null else greatest(0, least(100, l.total + coalesce(j.delta, 0)))::float8 end as effective,
         (select count(*)::int from notes n where n.application_id = a.id) as note_count,
         p.current_rubric_version,
         case when a.status = 'ineligible' then null else
           row_number() over (order by (case when l.total is null then null else greatest(0, least(100, l.total + coalesce(j.delta, 0))) end) desc nulls last,
                                       l.total desc nulls last, a.created_at asc) end as rank
       from applications a
       join candidates c on c.id = a.candidate_id
       join posts p on p.id = a.post_id
       left join latest l on l.application_id = a.id
       left join adj j on j.application_id = a.id
       where a.post_id = $1)
     select *, count(*) over ()::int as full_count from ranked
     where (cardinality($2::text[]) = 0 or status = any($2))
       and ($3::text is null or tier = $3)
       and ($4::text is null or first_name ilike '%' || $4 || '%' or last_name ilike '%' || $4 || '%' or email ilike '%' || $4 || '%' or reference ilike '%' || $4 || '%')
     order by rank asc nulls last, created_at asc
     limit $5 offset $6`,
    [postId, statuses, q.tier ?? null, q.q ? q.q.replace(/[%_\\]/g, "\\$&") : null, q.limit, q.offset],
  );
  return {
    total: r.rows[0]?.full_count ?? 0,
    rows: r.rows.map((x) => ({
      rank: x.rank === null ? null : Number(x.rank), id: x.id, reference: x.reference, status: x.status, source: x.source,
      returningCandidate: x.returning_candidate, submittedAt: x.created_at,
      candidate: { firstName: x.first_name, lastName: x.last_name, email: x.email, country: x.country, city: x.city },
      total: x.total, adjustment: x.adjustment, effective: x.effective, tier: x.tier, flags: x.flags,
      rubricVersion: x.rubric_version, stale: x.rubric_version !== null && x.rubric_version !== x.current_rubric_version, noteCount: x.note_count,
    })),
  };
}
