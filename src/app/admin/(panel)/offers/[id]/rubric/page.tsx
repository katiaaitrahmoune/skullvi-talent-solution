import { requireAdmin, orNotFound } from "@/lib/guards";
import { staff } from "@/lib/staff-api";
import type { Ranking, StaffPost } from "@/lib/admin-types";
import { RubricForm } from "@/components/admin/RubricForm";
import { PageTitle } from "@/components/admin/ui";

export default async function RubricPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const [post, scored] = await Promise.all([
    orNotFound(staff<StaffPost>(`/posts/${params.id}`)),
    staff<Ranking>(`/posts/${params.id}/ranking?status=scored&limit=1`),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title="Grille de notation" sub={post.title} />
      <RubricForm postId={post.id} initial={post.rubric} version={post.rubricVersion} applicationsScored={scored.total} />
    </div>
  );
}
