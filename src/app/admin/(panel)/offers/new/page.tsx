import { requireAdmin } from "@/lib/guards";
import { OfferForm } from "@/components/admin/OfferForm";
import { PageTitle } from "@/components/admin/ui";

export default async function NewOffer() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title="Nouvelle offre" sub="L'offre est créée en brouillon : assignez des réviseurs puis publiez-la." />
      <OfferForm />
    </div>
  );
}
