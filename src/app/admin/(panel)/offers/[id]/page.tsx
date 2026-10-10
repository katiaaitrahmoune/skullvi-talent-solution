import Link from "next/link";
import { Download, Pencil, SlidersHorizontal } from "lucide-react";
import { me, staff } from "@/lib/staff-api";
import { orNotFound } from "@/lib/guards";
import { cn } from "@/lib/cn";
import { CRITERIA, CRITERION_LABEL } from "@/lib/labels";
import type { AiRun, Ranking, StaffPost, StaffUser } from "@/lib/admin-types";
import { formatDate } from "@/lib/posts";
import { RankingTable } from "@/components/admin/RankingTable";
import { AiPanel, ImportPanel, ReviewerAssign, StatusControls } from "@/components/admin/OfferPanels";
import { Card, PageTitle, PostStatusBadge, linkBtnLight } from "@/components/admin/ui";

const FILTERS = [
  { key: "todo", label: "À examiner", status: "scored,in_review" },
  { key: "short", label: "Présélectionnées", status: "shortlisted" },
  { key: "declined", label: "Refusées", status: "declined" },
  { key: "inelig", label: "Non éligibles", status: "ineligible" },
  { key: "all", label: "Toutes", status: "" },
] as const;

export default async function OfferDetail({ params, searchParams }: { params: { id: string }; searchParams: { f?: string; q?: string } }) {
  const user = await me();
  const post = await orNotFound(staff<StaffPost>(`/posts/${params.id}`));
  const f = FILTERS.find((x) => x.key === searchParams.f) ?? FILTERS[0];
  const q = (searchParams.q ?? "").trim();
  const qs = new URLSearchParams({ limit: "200" });
  if (f.status) qs.set("status", f.status);
  if (q) qs.set("q", q);

  const [ranking, scored, run, users] = await Promise.all([
    staff<Ranking>(`/posts/${post.id}/ranking?${qs}`),
    staff<Ranking>(`/posts/${post.id}/ranking?status=scored&limit=1`),
    staff<AiRun | null>(`/posts/${post.id}/ai/top3`),
    user.role === "admin" ? staff<StaffUser[]>("/users") : Promise.resolve([] as StaffUser[]),
  ]);
  const isAdmin = user.role === "admin";
  const href = (key: string) => `/admin/offers/${post.id}?f=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageTitle
        title={post.title}
        sub={<span className="inline-flex flex-wrap items-center gap-2"><PostStatusBadge status={post.status} /> Clôture le {formatDate(post.deadline)} · {post.seats} place(s) · grille v{post.rubricVersion}</span>}
        actions={isAdmin && (
          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-wrap justify-end gap-2">
              <Link href={`/admin/offers/${post.id}/edit`} className={linkBtnLight}><Pencil className="h-4 w-4" aria-hidden />Modifier</Link>
              <Link href={`/admin/offers/${post.id}/rubric`} className={linkBtnLight}><SlidersHorizontal className="h-4 w-4" aria-hidden />Grille de notation</Link>
            </div>
            <StatusControls postId={post.id} status={post.status} autoQueue={post.autoQueue} scored={scored.total} />
          </div>
        )}
      />

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card title="Notation automatique" desc={`Grille version ${post.rubricVersion}`}>
          <ul className="space-y-1.5 text-sm">
            {CRITERIA.map((k) => <li key={k} className="flex justify-between gap-3 border-b border-line py-1"><span>{CRITERION_LABEL[k]}</span><b className="tabular-nums">{post.rubric.weights[k]} %</b></li>)}
          </ul>
          <p className="mt-3 text-xs text-muted">Requis : {post.rubric.skills.required.join(", ") || "—"}. Appréciés : {post.rubric.skills.preferred.join(", ") || "—"}. {post.rubric.knockouts.length} critère(s) éliminatoire(s).</p>
        </Card>
        <Card title="Équipe de revue" desc="Les réviseurs voient seulement les offres où ils sont assignés.">
          {isAdmin ? <ReviewerAssign postId={post.id} users={users.filter((u) => u.role === "reviewer" && u.active)} assigned={post.reviewers.map((r) => r.id)} /> : (
            <ul className="space-y-1 text-sm">{post.reviewers.map((r) => <li key={r.id}>{r.name}</li>)}</ul>
          )}
        </Card>
        {isAdmin ? <Card title="Importer des candidatures" desc="Un fichier CSV : chaque ligne passe par la même validation et la même notation que le formulaire."><ImportPanel postId={post.id} /></Card> : <div />}
      </div>

      <div className="mb-8"><AiPanel postId={post.id} initial={run} /></div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Classement <span className="text-muted">({ranking.total})</span></h2>
        <a href={`/admin/download/posts/${post.id}/export.csv`} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"><Download className="h-4 w-4" aria-hidden />Exporter en CSV</a>
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filtrer" className="flex flex-wrap gap-1.5">
          {FILTERS.map((x) => (
            <Link key={x.key} href={href(x.key)} className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", f.key === x.key ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink/30")}>{x.label}</Link>
          ))}
        </nav>
        <form className="flex gap-2">
          <input type="hidden" name="f" value={f.key} />
          <input name="q" defaultValue={q} placeholder="Nom, e-mail, référence…" className="w-56 rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand-500" />
          <button className="rounded-xl border border-line bg-white px-3 text-sm font-medium hover:border-ink/30">Chercher</button>
        </form>
      </div>
      <RankingTable rows={ranking.rows} />
    </>
  );
}
