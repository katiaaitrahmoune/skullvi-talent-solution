import Link from "next/link";
import { Plus } from "lucide-react";
import { me, staff } from "@/lib/staff-api";
import type { PostSummary, Ranking } from "@/lib/admin-types";
import { formatDate } from "@/lib/posts";
import { RankingTable } from "@/components/admin/RankingTable";
import { PageTitle, PostStatusBadge, linkBtn } from "@/components/admin/ui";

export default async function Dashboard() {
  const [user, posts] = await Promise.all([me(), staff<PostSummary[]>("/posts")]);
  const sum = (k: keyof PostSummary["counts"]) => posts.reduce((s, p) => s + p.counts[k], 0);
  const stats = [
    { label: "Offres publiées", value: posts.filter((p) => p.status === "open").length },
    { label: "Candidatures reçues", value: sum("applications") },
    { label: "En cours d'examen", value: sum("ongoing") },
    { label: "Présélectionnées", value: sum("shortlisted") },
  ];
  // The 3 offers with the most candidates waiting: show their best files straight away.
  const busy = [...posts].filter((p) => p.counts.ongoing > 0).sort((a, b) => b.counts.ongoing - a.counts.ongoing).slice(0, 3);
  const tops = await Promise.all(busy.map((p) => staff<Ranking>(`/posts/${p.id}/ranking?status=scored,in_review&limit=5`)));

  return (
    <>
      <PageTitle
        title="Tableau de bord"
        sub={`Bonjour ${user.name.replace(/\(.*\)/, "").trim()}. Voici où en sont les candidatures.`}
        actions={user.role === "admin" && <Link href="/admin/offers/new" className={linkBtn}><Plus className="h-4 w-4" aria-hidden />Nouvelle offre</Link>}
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((x) => (
          <div key={x.label} className="rounded-2xl border border-line bg-white p-5">
            <p className="text-3xl font-bold tabular-nums">{x.value}</p>
            <p className="mt-1 text-sm text-muted">{x.label}</p>
          </div>
        ))}
      </div>

      {busy.map((p, i) => (
        <section key={p.id} className="mb-8">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold">{p.title} <span className="text-base font-normal text-muted">· {p.counts.ongoing} à examiner</span></h2>
            <Link href={`/admin/offers/${p.id}`} className="text-sm font-medium text-brand-600 hover:underline">Voir tout le classement</Link>
          </div>
          <RankingTable rows={tops[i].rows} />
        </section>
      ))}

      <h2 className="mb-3 text-xl font-semibold">Toutes les offres</h2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted"><tr>{["Offre", "Statut", "Clôture", "Candidatures", "En cours", "Retenues"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {posts.map((p) => (
              <tr key={p.id} className="hover:bg-page">
                <td className="px-4 py-3"><Link href={`/admin/offers/${p.id}`} className="font-medium hover:text-brand-600">{p.title}</Link></td>
                <td className="px-4 py-3"><PostStatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-muted">{formatDate(p.deadline)}</td>
                <td className="px-4 py-3 tabular-nums">{p.counts.applications}</td>
                <td className="px-4 py-3 tabular-nums">{p.counts.ongoing}</td>
                <td className="px-4 py-3 tabular-nums">{p.counts.shortlisted}</td>
              </tr>
            ))}
            {!posts.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Aucune offre pour l'instant.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
