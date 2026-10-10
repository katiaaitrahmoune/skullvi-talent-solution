import { me, staff } from "@/lib/staff-api";
import { requireAdmin } from "@/lib/guards";
import type { StaffUser } from "@/lib/admin-types";
import { AddUserForm, UserActions } from "@/components/admin/UserForms";
import { Card, PageTitle, initials } from "@/components/admin/ui";

export default async function TeamPage() {
  await requireAdmin();
  const [users, self] = await Promise.all([staff<StaffUser[]>("/users"), me()]);
  return (
    <>
      <PageTitle title="Équipe" sub="Administrateurs et réviseurs qui se connectent à cet espace." />
      <Card title="Ajouter un membre" desc="Un réviseur se connecte sur /reviewer et ne voit que les offres où vous l'assignez. Il choisit qui part en entretien." className="mb-6"><AddUserForm /></Card>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted"><tr>{["Membre", "Rôle", "Statut", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-night text-xs font-semibold text-white">{initials(u.name)}</span><div><p className="font-medium">{u.name}</p><p className="text-xs text-muted">{u.email}</p></div></div></td>
                <td className="px-4 py-3">{u.role === "admin" ? "Admin" : "Réviseur"}</td>
                <td className="px-4 py-3">{u.active ? <span className="text-green-600">Actif</span> : <span className="text-muted">Désactivé</span>}</td>
                <td className="px-4 py-3"><UserActions id={u.id} active={u.active} self={u.id === self.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
