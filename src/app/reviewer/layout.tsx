import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { me } from "@/lib/staff-api";
import { logout } from "../admin/actions";

export const dynamic = "force-dynamic";

// Simple space for reviewers: log in, see the candidates, choose who goes to interview.
export default async function ReviewerLayout({ children }: { children: ReactNode }) {
  const user = await me();
  return (
    <>
      <div className="mx-auto w-full max-w-5xl px-4 pt-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-night-line bg-night px-5 py-2.5 text-white">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden text-sm text-white/70 sm:inline">Espace réviseur</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-white/70 sm:inline">{user.name}</span>
            <form action={logout}>
              <button className="rounded-full border-2 border-white/80 px-4 py-1.5 font-medium transition-colors hover:bg-white hover:text-night">Déconnexion</button>
            </form>
          </div>
        </header>
      </div>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
