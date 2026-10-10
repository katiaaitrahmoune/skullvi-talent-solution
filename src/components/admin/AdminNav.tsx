"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/admin", label: "Tableau de bord", exact: true },
    ...(isAdmin ? [{ href: "/admin/offers", label: "Offres" }, { href: "/admin/reviewers", label: "Équipe" }] : []),
  ];
  return (
    <nav aria-label="Administration" className="flex items-center gap-1">
      {items.map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={cn("rounded-lg px-3 py-2 text-[15px] transition-colors", active ? "bg-white/10 text-white" : "text-white/70 hover:text-white")}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
