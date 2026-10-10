import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { staff } from "@/lib/staff-api";
import { orNotFound } from "@/lib/guards";
import { cn } from "@/lib/cn";
import { CRITERION_LABEL, REVIEWER_STATUS, SEVERITY_DOT } from "@/lib/labels";
import type { ApplicationDetail, Ranking, StaffPost } from "@/lib/admin-types";
import { formatDateTime } from "@/lib/posts";
import { CandidateProfile } from "@/components/admin/CandidateProfile";
import { InterviewDecision } from "@/components/reviewer/Decision";
import { Card, TierBadge } from "@/components/admin/ui";

export default async function ReviewerCandidate({ params }: { params: { id: string } }) {
  const app = await orNotFound(staff<ApplicationDetail>(`/applications/${params.id}`));
  const [post, queue] = await Promise.all([
    staff<StaffPost>(`/posts/${app.post.id}`),
    staff<Ranking>(`/posts/${app.post.id}/ranking?status=in_review&limit=200`),
  ]);
  const name = `${app.candidate.firstName} ${app.candidate.lastName}`;
  const ev = app.evaluation;
  const st = REVIEWER_STATUS[app.status];
  const canDecide = app.allowedEvents.includes("accept");
  // "Next candidate": the next one still waiting, in ranking order.
  const waiting = queue.rows.filter((r) => r.id !== app.id);
  const idx = queue.rows.findIndex((r) => r.id === app.id);
  const next = (idx >= 0 ? queue.rows[idx + 1] : waiting[0]) ?? null;

  return (
    <>
      <Link href={`/reviewer/offers/${app.post.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden />{app.post.title}</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
          <p className="mt-1 text-muted">{app.candidate.city}, {app.candidate.country} · {app.reference} · reçue le {formatDateTime(app.submittedAt)}</p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-sm font-medium", st.cls)}>{st.label}</span>
      </div>
      {app.decision && <p className="mb-6 rounded-xl bg-white p-4 text-sm"><b>{app.status === "shortlisted" ? "Retenu pour entretien" : "Non retenu"}</b>{app.decision.note ? ` : ${app.decision.note}` : ""}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <CandidateProfile id={app.id} d={app.data} required={post.rubric.skills.required} preferred={post.rubric.skills.preferred} files={app.files} />

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          {canDecide && (
            <Card title="Votre décision" desc="Définitive : ce candidat quitte la liste « À examiner ».">
              <InterviewDecision id={app.id} name={name} />
            </Card>
          )}
          {app.status === "scored" && <p className="rounded-xl bg-white p-4 text-sm text-muted">Ce dossier n'est pas encore ouvert à la décision. L'administration doit d'abord l'envoyer en revue.</p>}

          <Card title="Note automatique">
            {!ev || ev.total === null ? <p className="text-sm text-muted">Pas de note pour ce dossier.</p> : (
              <>
                <div className="flex items-end justify-between">
                  <p className="text-5xl font-bold tabular-nums">{Math.round((app.effectiveScore ?? ev.total) * 10) / 10}<span className="text-lg font-normal text-muted"> /100</span></p>
                  <div className="text-right"><TierBadge tier={ev.tier} /><p className="mt-1 text-xs text-muted">tier</p></div>
                </div>
                <ul className="mt-5 space-y-3">
                  {ev.breakdown.map((c) => (
                    <li key={c.key}>
                      <div className="flex items-baseline justify-between text-sm"><span className="font-medium">{CRITERION_LABEL[c.key]}</span><span className="tabular-nums text-muted">{c.points} / {c.weight}</span></div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"><div className={cn("h-full rounded-full", c.score >= 0.7 ? "bg-green-500" : c.score >= 0.4 ? "bg-accent-500" : "bg-brand-500")} style={{ width: `${c.score * 100}%` }} /></div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {ev && ev.flags.some((f) => f.severity !== "info") && (
            <Card title="Points d'attention">
              <ul className="space-y-2 text-sm">{ev.flags.filter((f) => f.severity !== "info").map((f) => <li key={f.code} className="flex items-start gap-2"><span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", SEVERITY_DOT[f.severity])} />{f.message}</li>)}</ul>
            </Card>
          )}

          {next && (
            <Link href={`/reviewer/applications/${next.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 text-sm font-medium transition-colors hover:border-ink/30">
              <span>Candidat suivant : {next.candidate.firstName} {next.candidate.lastName}</span><ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
