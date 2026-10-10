import Link from "next/link";
import { ArrowRight, CalendarClock, MapPin } from "lucide-react";
import { Ribbon } from "@/components/brand/Ribbon";
import { fetchOpenPosts } from "@/lib/public-api";
import { formatDate } from "@/lib/posts";

export const dynamic = "force-dynamic"; // offers come from the admin, never cache them

export default async function OffersPage() {
  const res = await fetchOpenPosts();
  const posts = res.ok ? res.data : [];
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <section className="relative overflow-hidden rounded-3xl bg-night px-6 py-14 text-white sm:px-14 sm:py-20">
        <Ribbon className="pointer-events-none absolute inset-0 h-full w-full opacity-90" />
        <div className="relative max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Offres ouvertes</h1>
          <p className="mt-5 max-w-prose text-lg text-white/85">
            Choisissez une offre, puis postulez en quelques minutes.
          </p>
          <p className="mt-3 text-xl font-medium">
            <span className="text-blue-500">Partage.</span>{" "}
            <span className="text-green-500">Apprends.</span>{" "}
            <span className="text-brand-500">Gagne.</span>
          </p>
          <a
            href="#offres"
            className="group mt-8 inline-flex h-14 items-center gap-3 rounded-xl bg-brand-500 px-7 text-lg font-medium text-white transition-colors hover:bg-brand-600"
          >
            Voir les offres
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </a>
        </div>
      </section>

      <ul id="offres" className="mt-12 scroll-mt-6 space-y-5">
        {!res.ok && (
          <li className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-muted">Le serveur démarre, les offres s'afficheront dans un instant. Rechargez la page dans une minute.</li>
        )}
        {res.ok && posts.length === 0 && (
          <li className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-muted">Aucune offre ouverte pour le moment. Revenez bientôt.</li>
        )}
        {posts.map((p) => (
          <li key={p.id} className="rounded-2xl border border-line bg-white p-6 transition-shadow hover:shadow-card sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-2xl">
                <div className="mb-3 flex gap-2 text-xs">
                  <span className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700">{p.type}</span>
                  <span className="rounded-full bg-green-500/10 px-3 py-1 font-medium text-green-600">{p.mode}</span>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">{p.title}</h2>
                <p className="text-muted">{p.organisation}</p>
                <p className="mt-4">{p.summary}</p>
                <details className="group/d mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-700">Voir le détail de l'offre</summary>
                  <div className="mt-4 space-y-5 text-[15px]">
                    <p className="whitespace-pre-line">{p.description}</p>
                    <List title="Vos missions" items={p.missions} />
                    <List title="Indispensable" items={p.mustHave} />
                    <List title="Un plus" items={p.niceToHave} />
                    <p className="text-sm text-muted">
                      {p.minEducation !== "Aucun prérequis" && <>Niveau : {p.minEducation}. </>}Langues : {p.languages}. Début : {formatDate(p.startDate)}.
                    </p>
                  </div>
                </details>
                <p className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden />{p.location}</span>
                  <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" aria-hidden />Clôture le {formatDate(p.deadline)}</span>
                </p>
              </div>
              <Link
                href={`/apply/${p.id}`}
                className="group inline-flex h-12 items-center gap-3 rounded-xl bg-brand-500 px-6 text-[15px] font-medium text-white transition-colors hover:bg-brand-600"
              >
                Postuler
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}
