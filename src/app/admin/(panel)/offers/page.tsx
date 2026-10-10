import Link from "next/link";
import { Plus } from "lucide-react";
import { staff } from "@/lib/staff-api";
import { requireAdmin } from "@/lib/guards";
import type { PostSummary } from "@/lib/admin-types";
import { formatDate } from "@/lib/posts";
import { PageTitle, PostStatusBadge, linkBtn } from "@/components/admin/ui";

export default async function OffersAdmin() {
  await requireAdmin();
  const posts = await staff<PostSummary[]>("/posts");
  return (
    <>
      <PageTitle title="Offres" sub="Publiez des offres et suivez leurs candidatures." actions={<Link href="/admin/offers/new" className={linkBtn}><Plus className="h-4 w-4" aria-hidden />Nouvelle offre</Link>} />
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted"><tr>{["Offre", "Statut", "Date limite", "Candidatures", "En cours", "Non éligibles", "Grille"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {posts.map((p) => (
              <tr key={p.id} className="hover:bg-page">
                <td className="px-4 py-3"><Link href={`/admin/offers/${p.id}`} className="font-medium hover:text-brand-600">{p.title}</Link><p className="text-xs text-muted">{p.type} · {p.mode}</p></td>
                <td className="px-4 py-3"><PostStatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-muted">{formatDate(p.deadline)}</td>
                <td className="px-4 py-3 tabular-nums">{p.counts.applications}</td>
                <td className="px-4 py-3 tabular-nums">{p.counts.ongoing}</td>
                <td className="px-4 py-3 tabular-nums">{p.counts.ineligible}</td>
                <td className="px-4 py-3 text-muted">v{p.rubricVersion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
