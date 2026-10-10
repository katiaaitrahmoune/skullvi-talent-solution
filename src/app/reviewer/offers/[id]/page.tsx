import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { staff } from "@/lib/staff-api";
import { orNotFound } from "@/lib/guards";
import { cn } from "@/lib/cn";
import { REVIEWER_STATUS, SEVERITY_DOT } from "@/lib/labels";
import type { Ranking, StaffPost } from "@/lib/admin-types";
import { formatDate } from "@/lib/posts";
import { QuickDecision } from "@/components/reviewer/Decision";
import { ScoreBar, TierBadge } from "@/components/admin/ui";

const TABS = [
  { key: "todo", label: "À examiner", status: "in_review" },
  { key: "yes", label: "Retenus pour entretien", status: "shortlisted" },
  { key: "no", label: "Non retenus", status: "declined" },
] as const;

export default async function ReviewerOffer({ params, searchParams }: { params: { id: string }; searchParams: { t?: string; q?: string } }) {
  const tab = TABS.find((x) => x.key === searchParams.t) ?? TABS[0];
  const q = (searchParams.q ?? "").trim();
  const post = await orNotFound(staff<StaffPost>(`/posts/${params.id}`));

  const list = (status: string, limit: number, search = "") => staff<Ranking>(`/posts/${post.id}/ranking?status=${status}&limit=${limit}${search ? `&q=${encodeURIComponent(search)}` : ""}`);
  // Active tab: the full list. The other tabs: just their counts.
  const [todo, yes, no] = await Promise.all(TABS.map((t) => (t.key === tab.key ? list(t.status, 200, q) : list(t.status, 1))));
  const counts = { todo: todo.total, yes: yes.total, no: no.total } as const;
  const active = { todo, yes, no }[tab.key];
  const href = (key: string) => `/reviewer/offers/${post.id}?t=${key}`;

  return (
    <>
      <Link href="/reviewer" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden />Mes offres</Link>
      <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
      <p className="mt-1 text-muted">Clôture le {formatDate(post.deadline)} · {counts.yes} candidat(s) retenu(s) pour entretien sur {post.seats} place(s)</p>

      <p className="mt-4 rounded-xl bg-white p-4 text-sm text-muted">
        Les candidats sont classés par note automatique (sur 100). Ouvrez un dossier pour lire le détail, puis choisissez qui est invité en entretien. <b className="text-ink">Une décision est définitive.</b>
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filtrer" className="flex flex-wrap gap-1.5">
          {TABS.map((x) => (
            <Link key={x.key} href={href(x.key)} className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", tab.key === x.key ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink/30")}>
              {x.label} <span className="opacity-70">({counts[x.key]})</span>
            </Link>
          ))}
        </nav>
        <form className="flex gap-2">
          <input type="hidden" name="t" value={tab.key} />
          <input name="q" defaultValue={q} placeholder="Chercher un nom…" aria-label="Chercher un candidat" className="w-44 rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand-500" />
          <button className="rounded-xl border border-line bg-white px-3 text-sm font-medium hover:border-ink/30">OK</button>
        </form>
      </div>

      <ul className="mt-5 space-y-3">
        {active.rows.map((r) => {
          const name = `${r.candidate.firstName} ${r.candidate.lastName}`;
          const alerts = r.flags.filter((f) => f.severity !== "info");
          const st = REVIEWER_STATUS[r.status];
          return (
            <li key={r.id} className="rounded-2xl border border-line bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-start gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-night text-sm font-bold text-white">{r.rank ?? "–"}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/reviewer/applications/${r.id}`} className="text-lg font-semibold hover:text-brand-600">{name}</Link>
                    <p className="text-xs text-muted">{r.candidate.city}, {r.candidate.country} · {r.reference}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <ScoreBar value={r.effective} adjustment={r.adjustment} />
                      <TierBadge tier={r.tier} />
                      {tab.key !== "todo" && <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", st.cls)}>{st.label}</span>}
                    </div>
                    {alerts.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-xs text-muted">
                        {alerts.slice(0, 2).map((f) => <li key={f.code} className="flex items-center gap-1.5"><span className={cn("h-1.5 w-1.5 rounded-full", SEVERITY_DOT[f.severity])} />{f.message}</li>)}
                      </ul>
                    )}
                    <Link href={`/reviewer/applications/${r.id}`} className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline">Lire le dossier</Link>
                  </div>
                </div>
                {tab.key === "todo" && <QuickDecision id={r.id} name={name} />}
              </div>
            </li>
          );
        })}
        {!active.rows.length && (
          <li className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-muted">
            {tab.key === "todo" ? "Aucun candidat à examiner pour le moment." : "Aucun candidat dans cette liste."}
          </li>
        )}
      </ul>
    </>
  );
}
