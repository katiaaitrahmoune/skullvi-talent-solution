"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ArrowDown, ArrowUp, Download, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { aiReason } from "@/lib/labels";
import type { AiRun, ImportReport, PostStatus, StaffUser } from "@/lib/admin-types";
import { changeStatus, confirmTop3, importCsv, queueOffer, runTop3, saveReviewers, type Result } from "@/app/admin/actions";
import { Card, TierBadge } from "./ui";

export function StatusControls({ postId, status, autoQueue, scored }: { postId: string; status: PostStatus; autoQueue: boolean; scored: number }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (s: PostStatus) => start(async () => {
    const r = await changeStatus(postId, s);
    setMsg(r.ok ? null : { ok: false, text: r.error });
  });
  const queue = () => start(async () => {
    const r = await queueOffer(postId);
    setMsg(r.ok ? { ok: true, text: `${(r as { queued: number }).queued} candidature(s) envoyée(s) en revue.` } : { ok: false, text: r.error });
  });
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {status !== "open" && <Button loading={pending} onClick={() => set("open")}>Publier</Button>}
        {status === "open" && <Button variant="dark" loading={pending} onClick={() => set("closed")}>Clôturer</Button>}
        {status === "open" && <Button variant="ghost" loading={pending} onClick={() => set("draft")}>Repasser en brouillon</Button>}
        {!autoQueue && scored > 0 && <Button variant="dark" loading={pending} onClick={queue}>Envoyer {scored} en revue</Button>}
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={cn("text-sm font-medium", msg.ok ? "text-green-600" : "text-danger")}>{msg.text}</p>}
    </div>
  );
}

export function ReviewerAssign({ postId, users, assigned }: { postId: string; users: StaffUser[]; assigned: string[] }) {
  const [ids, setIds] = useState<string[]>(assigned);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const save = () => start(async () => {
    const r = await saveReviewers(postId, ids);
    setMsg(r.ok ? { ok: true, text: "Équipe enregistrée." } : { ok: false, text: r.error });
  });
  if (!users.length) return <p className="text-sm text-muted">Aucun réviseur actif. Ajoutez-en dans l'onglet « Équipe ».</p>;
  return (
    <div>
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id}>
            <label className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm", ids.includes(u.id) ? "border-brand-500 bg-brand-50" : "border-line")}>
              <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand-500))]" checked={ids.includes(u.id)} onChange={() => setIds(ids.includes(u.id) ? ids.filter((x) => x !== u.id) : [...ids, u.id])} />
              <span><span className="block font-medium">{u.name}</span><span className="block text-xs text-muted">{u.email}</span></span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3">
        {msg ? <p role={msg.ok ? "status" : "alert"} className={cn("text-sm font-medium", msg.ok ? "text-green-600" : "text-danger")}>{msg.text}</p> : <span />}
        <Button loading={pending} onClick={save}>Enregistrer</Button>
      </div>
    </div>
  );
}

function ImportSubmit() {
  const { pending } = useFormStatus();
  return <Button loading={pending} type="submit">Importer</Button>;
}

export function ImportPanel({ postId }: { postId: string }) {
  const [state, action] = useFormState(importCsv, undefined as Result<ImportReport> | undefined);
  const rep = state?.ok ? state : null;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="postId" value={postId} />
      <input type="file" name="file" accept=".csv,text/csv" required className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-page file:px-3 file:py-2 file:text-sm file:font-medium" />
      <label className="flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 accent-[rgb(var(--brand-500))]" />
        Je confirme que ces candidats ont donné leur accord pour le traitement de leurs données.
      </label>
      <div className="flex items-center justify-between gap-3">
        <a href="/admin/download/imports/template.csv" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"><Download className="h-4 w-4" aria-hidden />Modèle CSV</a>
        <ImportSubmit />
      </div>
      {state && !state.ok && <p role="alert" className="text-sm font-medium text-danger">{state.error}</p>}
      {rep && (
        <div role="status" className="rounded-xl bg-page p-3 text-sm">
          <p className="font-semibold">{rep.accepted} importée(s) sur {rep.total}{rep.rejected ? `, ${rep.rejected} rejetée(s)` : ""}.</p>
          <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs">
            {rep.report.filter((r) => r.outcome !== "accepted").map((r) => (
              <li key={r.row}>Ligne {r.row} ({r.email || "?"}) : {r.outcome === "duplicate" ? "déjà candidat à cette offre" : Object.values(r.errors ?? {}).join(" ; ") || r.outcome}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}

// AI top 3: suggestion with reasons; the reviewer accepts, reorders or rejects, and confirms.
export function AiPanel({ postId, initial }: { postId: string; initial: AiRun | null }) {
  const [run, setRun] = useState<AiRun | null>(initial);
  const [order, setOrder] = useState<string[]>(initial && !initial.confirmed ? initial.top3.map((t) => t.applicationId) : []);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const launch = () => start(async () => {
    setError("");
    const r = await runTop3(postId);
    if (r.ok) { const x = (r as unknown as { run: AiRun }).run; setRun(x); setOrder(x.top3.map((t) => t.applicationId)); } else setError(r.error);
  });
  const confirm = () => start(async () => {
    if (!run) return;
    setError("");
    const r = await confirmTop3(run.id, order);
    if (r.ok) setRun((r as unknown as { run: AiRun }).run); else setError(r.error);
  });
  const move = (i: number, d: -1 | 1) => setOrder((o) => { const a = [...o]; [a[i], a[i + d]] = [a[i + d], a[i]]; return a; });

  const pending3 = run && !run.confirmed;
  const byId: Map<string, AiRun["top3"][number]> = new Map((run?.top3 ?? []).map((t): [string, AiRun["top3"][number]] => [t.applicationId, t]));
  return (
    <Card
      title="Top 3 suggéré"
      desc="Les 10 meilleurs scores sont envoyés anonymisés à l'IA, qui propose 3 candidats avec forces, risques et questions d'entretien. C'est vous qui décidez."
      action={<Button loading={pending && !order.length} variant={run ? "ghost" : "primary"} onClick={launch}><Sparkles className="h-4 w-4" aria-hidden />{run ? "Relancer" : "Suggérer le top 3"}</Button>}
    >
      {pending && <p className="text-sm text-muted">Analyse en cours… (jusqu'à 20 secondes)</p>}
      {error && <p role="alert" className="mb-3 text-sm font-medium text-danger">{error}</p>}
      {!run && !pending && <p className="text-sm text-muted">Aucune suggestion pour l'instant. Il faut au moins 3 candidatures notées.</p>}
      {run && (
        <>
          <p className="mb-4 text-xs text-muted">
            {run.source === "ai" ? <>Proposé par l'IA ({run.model}).</> : <span className="font-medium text-brand-700">Repli automatique : {aiReason(run.fallbackReason)}. Top 3 par score uniquement.</span>}
            {run.confirmed && " · Confirmé."}
          </p>
          <ol className="space-y-4">
            {(pending3 ? order : run.top3.map((t) => t.applicationId)).map((id, i, arr) => {
              const t = byId.get(id)!;
              const kept = run.confirmed ? run.confirmed.order.includes(id) : true;
              return (
                <li key={id} className={cn("rounded-xl border border-line p-4", !kept && "opacity-50")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-night text-sm font-bold text-white">{i + 1}</span>
                      <div>
                        <a href={`/admin/applications/${t.applicationId}`} className="font-semibold hover:text-brand-600">{t.name ?? t.reference}</a>
                        <p className="text-xs text-muted">{t.reference} · score {t.score ?? "—"} <TierBadge tier={t.tier} /></p>
                      </div>
                    </div>
                    {pending3 && (
                      <div className="flex gap-1">
                        <button type="button" aria-label="Monter" disabled={i === 0} onClick={() => move(i, -1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                        <button type="button" aria-label="Descendre" disabled={i === arr.length - 1} onClick={() => move(i, 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                        <button type="button" aria-label="Rejeter cette suggestion" onClick={() => setOrder(order.filter((x) => x !== id))} className="grid h-8 w-8 place-items-center rounded-lg border border-line hover:bg-brand-50 hover:text-brand-700"><X className="h-4 w-4" /></button>
                      </div>
                    )}
                    {run.confirmed && <span className="text-xs font-medium">{kept ? "Retenu" : "Suggestion rejetée"}</span>}
                  </div>
                  <div className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
                    <Reasons title="Forces" items={t.strengths} tone="text-green-600" />
                    <Reasons title="Risques" items={t.risks} tone="text-brand-700" />
                    <Reasons title="Questions d'entretien" items={t.questions} tone="text-ink" />
                  </div>
                </li>
              );
            })}
          </ol>
          {pending3 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">{order.length ? `${order.length} candidat(s) seront présélectionnés, dans cet ordre.` : "Tout est rejeté : rien ne sera présélectionné."}</p>
              <Button loading={pending} onClick={confirm}>Confirmer la sélection</Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function Reasons({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div>
      <h4 className={cn("mb-1 text-xs font-semibold uppercase tracking-wide", tone)}>{title}</h4>
      <ul className="list-disc space-y-1 pl-4 text-muted">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}
