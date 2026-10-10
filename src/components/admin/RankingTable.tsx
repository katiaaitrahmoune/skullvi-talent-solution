import Link from "next/link";
import { formatDate } from "@/lib/posts";
import { SEVERITY_DOT } from "@/lib/labels";
import { cn } from "@/lib/cn";
import type { RankedRow } from "@/lib/admin-types";
import { AppStatusBadge, ScoreBar, TierBadge } from "./ui";

// "View ranked list": best score first; adjusted scores show the reviewer's correction.
export function RankingTable({ rows, showPost }: { rows: RankedRow[]; showPost?: string }) {
  if (!rows.length) return <p className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-muted">Aucune candidature pour ce filtre.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
          <tr>{["#", "Candidat", "Score", "Tier", "Alertes", "Statut"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => {
            const worst = r.flags.some((f) => f.severity === "high") ? "high" : r.flags.some((f) => f.severity === "warn") ? "warn" : "info";
            const important = r.flags.filter((f) => f.severity !== "info");
            return (
              <tr key={r.id} className="transition-colors hover:bg-page">
                <td className="w-12 px-4 py-3 font-semibold tabular-nums text-muted">{r.rank ?? "–"}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/applications/${r.id}`} className="font-medium hover:text-brand-600">{r.candidate.firstName} {r.candidate.lastName}</Link>
                  {r.returningCandidate && <span className="ml-2 rounded bg-page px-1.5 py-0.5 text-[10px] uppercase text-muted">déjà vu</span>}
                  <p className="text-xs text-muted">{showPost ? `${showPost} · ` : ""}{r.candidate.city}, {r.candidate.country} · {r.reference} · {formatDate(r.submittedAt)}</p>
                </td>
                <td className="px-4 py-3"><ScoreBar value={r.effective} adjustment={r.adjustment} />{r.stale && <p className="mt-1 text-[11px] text-muted">ancienne grille</p>}</td>
                <td className="px-4 py-3"><TierBadge tier={r.tier} /></td>
                <td className="px-4 py-3">
                  {important.length ? (
                    <span title={important.map((f) => f.message).join("\n")} className="inline-flex items-center gap-1.5 text-xs">
                      <span className={cn("h-2 w-2 rounded-full", SEVERITY_DOT[worst])} />{important.length} alerte{important.length > 1 ? "s" : ""}
                    </span>
                  ) : <span className="text-xs text-muted">—</span>}
                  {r.noteCount > 0 && <span className="ml-2 text-xs text-muted">{r.noteCount} note{r.noteCount > 1 ? "s" : ""}</span>}
                </td>
                <td className="px-4 py-3"><AppStatusBadge status={r.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
