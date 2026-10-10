import { notFound } from "next/navigation";
import { ApplyWizard } from "@/components/apply/ApplyWizard";
import { fetchPost } from "@/lib/public-api";

export const dynamic = "force-dynamic";

export default async function ApplyPage({ params }: { params: { id: string } }) {
  const res = await fetchPost(params.id);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Le serveur démarre…</h1>
        <p className="mt-3 text-muted">Impossible de charger l'offre pour le moment. Réessayez dans une minute.</p>
      </main>
    );
  }
  return <ApplyWizard post={res.data} />;
}
