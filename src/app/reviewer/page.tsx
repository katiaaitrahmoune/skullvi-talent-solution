import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { me, staff } from "@/lib/staff-api";
import type { PostSummary, Ranking } from "@/lib/admin-types";
import { formatDate } from "@/lib/posts";

export default async function ReviewerHome() {
  const [user, posts] = await Promise.all([me(), staff<PostSummary[]>("/posts")]);
  // How many candidates are waiting for a decision on each offer.
  const waiting = await Promise.all(posts.map((p) => staff<Ranking>(`/posts/${p.id}/ranking?status=in_review&limit=1`)));

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Bonjour {user.name.replace(/\(.*\)/, "").trim()}</h1>
      <p className="mt-1 text-muted">Choisissez une offre, lisez les dossiers et décidez qui est invité en entretien.</p>

      <ul className="mt-8 space-y-4">
        {posts.map((p, i) => (
          <li key={p.id}>
            <Link href={`/reviewer/offers/${p.id}`} className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5 transition-shadow hover:shadow-card sm:p-6">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{p.title}</h2>
                <p className="mt-1 text-sm text-muted">{p.type} · {p.mode} · clôture le {formatDate(p.deadline)}</p>
                <p className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-accent-400/25 px-3 py-1 font-medium text-brand-900">{waiting[i].total} à examiner</span>
                  <span className="rounded-full bg-green-500/15 px-3 py-1 font-medium text-green-600">{p.counts.shortlisted} en entretien</span>
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        ))}
        {!posts.length && (
          <li className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-muted">
            Aucune offre ne vous est assignée pour l'instant. Demandez à l'administration de vous en assigner une.
          </li>
        )}
      </ul>
    </>
  );
}
