import { requireAdmin, orNotFound } from "@/lib/guards";
import { staff } from "@/lib/staff-api";
import type { StaffPost } from "@/lib/admin-types";
import { OfferForm } from "@/components/admin/OfferForm";
import { PageTitle } from "@/components/admin/ui";

export default async function EditOffer({ params }: { params: { id: string } }) {
  await requireAdmin();
  const post = await orNotFound(staff<StaffPost>(`/posts/${params.id}`));
  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title="Modifier l'offre" sub={post.title} />
      <OfferForm initial={post} />
    </div>
  );
}
