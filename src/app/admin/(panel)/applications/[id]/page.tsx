import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { staff } from "@/lib/staff-api";
import { orNotFound } from "@/lib/guards";
import { cn } from "@/lib/cn";
import { AUDIT_LABEL, CRITERION_LABEL, SEVERITY_DOT } from "@/lib/labels";
import type { ApplicationDetail, StaffPost } from "@/lib/admin-types";
import { formatDateTime } from "@/lib/posts";
import { CandidateProfile } from "@/components/admin/CandidateProfile";
import { AdjustForm, DecisionPanel, NoteForm } from "@/components/admin/ReviewActions";
import { AppStatusBadge, Card, TierBadge } from "@/components/admin/ui";

export default async function ApplicationPage({ params }: { params: { id: string } }) {
  const app = await orNotFound(staff<ApplicationDetail>(`/applications/${params.id}`));
  const post = await staff<StaffPost>(`/posts/${app.post.id}`);
  const ev = app.evaluation;
  const open = app.allowedEvents.includes("accept");
  const canAdjust = app.status === "scored" || app.status === "in_review";

  return (
    <>
      <Link href={`/admin/offers/${app.post.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden />{app.post.title}</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{app.candidate.firstName} {app.candidate.lastName}</h1>
          <p className="mt-1 text-muted">{app.reference} · reçue le {formatDateTime(app.submittedAt)} · via {app.source === "csv" ? "import CSV" : "formulaire"}{app.returningCandidate && " · a déjà candidaté"}</p>
        </div>
        <AppStatusBadge status={app.status} />
      </div>
      {app.decision?.note && <p className="mb-6 rounded-xl bg-white p-4 text-sm"><b>Note de décision :</b> {app.decision.note}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <CandidateProfile id={app.id} d={app.data} required={post.rubric.skills.required} preferred={post.rubric.skills.preferred} files={app.files} />

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <Card title="Note automatique" desc={ev ? `Grille version ${ev.rubricVersion}` : undefined}>
            {!ev && <p className="text-sm text-muted">Pas encore évaluée.</p>}
            {ev && !ev.eligible && ev.total === null && (
              <div>
                <p className="mb-2 text-sm font-semibold text-brand-700">Non éligible : critères éliminatoires non remplis</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted">{ev.knockouts.map((k, i) => <li key={i}>{k.message}</li>)}</ul>
              </div>
            )}
            {ev && ev.total !== null && (
              <>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-5xl font-bold tabular-nums">{Math.round((app.effectiveScore ?? ev.total) * 10) / 10}<span className="text-lg font-normal text-muted"> /100</span></p>
                    {app.adjustment && app.adjustment.delta !== 0 && <p className="mt-1 text-sm text-muted">Note automatique {ev.total}, ajustée de <b className={app.adjustment.delta > 0 ? "text-green-600" : "text-brand-700"}>{app.adjustment.delta > 0 ? "+" : ""}{app.adjustment.delta}</b></p>}
                  </div>
                  <div className="text-right"><TierBadge tier={ev.tier} /><p className="mt-1 text-xs text-muted">tier</p></div>
                </div>
                {ev.stale && <p className="mt-3 flex items-start gap-2 rounded-lg bg-accent-400/20 p-2 text-xs"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />Notée avec la grille v{ev.rubricVersion} ; la grille actuelle est la v{ev.currentRubricVersion}.</p>}
                {ev.knockouts.length > 0 && <p className="mt-3 rounded-lg bg-brand-500/10 p-2 text-xs text-brand-700">{ev.knockouts.map((k) => k.message).join(" · ")}</p>}
                <ul className="mt-5 space-y-3">
                  {ev.breakdown.map((c) => (
                    <li key={c.key}>
                      <div className="flex items-baseline justify-between text-sm"><span className="font-medium">{CRITERION_LABEL[c.key]}</span><span className="tabular-nums text-muted">{c.points} / {c.weight}</span></div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"><div className={cn("h-full rounded-full", c.score >= 0.7 ? "bg-green-500" : c.score >= 0.4 ? "bg-accent-500" : "bg-brand-500")} style={{ width: `${c.score * 100}%` }} /></div>
                      <details className="mt-1"><summary className="cursor-pointer text-xs text-muted hover:text-ink">Pourquoi cette note</summary><ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted">{c.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></details>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {ev && ev.flags.length > 0 && (
            <Card title="Alertes">
              <ul className="space-y-2 text-sm">{ev.flags.map((f) => <li key={f.code} className="flex items-start gap-2"><span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", SEVERITY_DOT[f.severity])} />{f.message}</li>)}</ul>
            </Card>
          )}

          <Card title="Notes de l'équipe" desc={`${app.notes.length} note(s)`}>
            <ul className="space-y-3">{app.notes.map((n) => <li key={n.id} className="text-sm"><p className="text-xs text-muted">{n.author} · {formatDateTime(n.created_at)}</p><p className="mt-0.5 whitespace-pre-line">{n.body}</p></li>)}</ul>
            <NoteForm id={app.id} />
          </Card>

          {canAdjust && (
            <Card title="Ajuster la note" desc="Corrige la note automatique de 20 points maximum. Le motif reste visible sur le dossier.">
              {app.adjustments.length > 0 && <ul className="space-y-1 text-xs text-muted">{app.adjustments.map((a, i) => <li key={i} className={i === 0 ? "font-medium text-ink" : ""}>{a.author} : {a.delta > 0 ? "+" : ""}{a.delta}, « {a.reason} » {i === 0 ? "(en vigueur)" : ""}</li>)}</ul>}
              <AdjustForm id={app.id} current={app.adjustment?.delta ?? 0} />
            </Card>
          )}

          {open && <DecisionPanel id={app.id} />}
          {app.status === "scored" && <p className="rounded-xl bg-white p-4 text-sm text-muted">Cette candidature n'est pas encore en revue : l'administration doit la libérer (« Envoyer en revue ») avant la décision.</p>}

          <Card title="Historique">
            <details><summary className="cursor-pointer text-sm text-muted hover:text-ink">{app.audit.length} événement(s)</summary>
              <ul className="mt-3 space-y-2 text-xs text-muted">{app.audit.map((a, i) => <li key={i}><b className="text-ink">{AUDIT_LABEL[a.action] ?? a.action}</b> · {a.actor_label} · {formatDateTime(a.at)}</li>)}</ul>
            </details>
          </Card>
        </aside>
      </div>
    </>
  );
}
