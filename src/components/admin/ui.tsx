import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { APP_STATUS, POST_STATUS, TIER_CLS } from "@/lib/labels";
import type { AppStatus, PostStatus } from "@/lib/admin-types";

export const inputCls =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-page";

export function Card({ title, desc, children, className, action }: { title?: string; desc?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-white p-5 sm:p-6", className)}>
      {title && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {desc && <p className="mt-0.5 text-sm text-muted">{desc}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs font-medium text-danger">{error}</span>}
    </label>
  );
}

const pill = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";
export const AppStatusBadge = ({ status }: { status: AppStatus }) => <span className={cn(pill, APP_STATUS[status].cls)}>{APP_STATUS[status].label}</span>;
export const PostStatusBadge = ({ status }: { status: PostStatus }) => <span className={cn(pill, POST_STATUS[status].cls)}>{POST_STATUS[status].label}</span>;
export const TierBadge = ({ tier }: { tier: string | null }) =>
  tier ? <span className={cn("inline-grid h-6 w-6 place-items-center rounded-md text-xs font-bold", TIER_CLS[tier] ?? "bg-night-btn/15 text-ink")}>{tier}</span> : <span className="text-muted">—</span>;

export function ScoreBar({ value, adjustment = 0 }: { value: number | null; adjustment?: number }) {
  if (value === null) return <span className="text-sm text-muted">—</span>;
  const color = value >= 70 ? "bg-green-500" : value >= 45 ? "bg-accent-500" : "bg-brand-500";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line"><span className={cn("block h-full rounded-full", color)} style={{ width: `${value}%` }} /></span>
      <span className="text-sm font-semibold tabular-nums">{Math.round(value * 10) / 10}</span>
      {adjustment !== 0 && <span className={cn("text-xs font-medium", adjustment > 0 ? "text-green-600" : "text-brand-700")}>{adjustment > 0 ? "+" : ""}{adjustment}</span>}
    </span>
  );
}

export function PageTitle({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const linkBtn = "inline-flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-5 text-[15px] font-medium text-white transition-colors hover:bg-brand-600";
export const linkBtnLight = "inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-5 text-[15px] font-medium transition-colors hover:border-ink/30";
export const initials = (name: string) => name.replace(/\(.*\)/, "").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
