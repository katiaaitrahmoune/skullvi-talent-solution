"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { addAdjustment, addNote, decide } from "@/app/admin/actions";
import { Card, inputCls } from "./ui";

type Msg = { ok: boolean; text: string } | null;
const Message = ({ m }: { m: Msg }) => (m ? <p role={m.ok ? "status" : "alert"} className={cn("text-sm font-medium", m.ok ? "text-green-600" : "text-danger")}>{m.text}</p> : null);

export function NoteForm({ id }: { id: string }) {
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const send = () => start(async () => {
    const r = await addNote(id, body);
    if (r.ok) { setBody(""); setMsg(null); } else setMsg({ ok: false, text: r.issues?.body ?? r.error });
  });
  return (
    <div className="mt-4 space-y-2">
      <textarea rows={3} className={inputCls} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Points forts, doutes, questions pour l'entretien…" />
      <div className="flex items-center justify-between gap-3"><Message m={msg} /><Button loading={pending} disabled={!body.trim()} onClick={send} className="ml-auto">Ajouter la note</Button></div>
    </div>
  );
}

// "Adjust": correct the automatic score by up to 20 points, with a reason that stays on the file.
export function AdjustForm({ id, current }: { id: string; current: number }) {
  const [delta, setDelta] = useState(current);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const send = () => start(async () => {
    const r = await addAdjustment(id, delta, reason);
    setMsg(r.ok ? { ok: true, text: "Ajustement enregistré." } : { ok: false, text: r.issues?.reason ?? r.issues?.delta ?? r.error });
    if (r.ok) setReason("");
  });
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-3">
        <input aria-label="Points à ajouter ou retirer" type="range" min={-20} max={20} step={1} value={delta} onChange={(e) => setDelta(Number(e.target.value))} className="flex-1 accent-[rgb(var(--brand-500))]" />
        <span className={cn("w-12 text-right text-lg font-bold tabular-nums", delta > 0 ? "text-green-600" : delta < 0 ? "text-brand-700" : "text-muted")}>{delta > 0 ? "+" : ""}{delta}</span>
      </div>
      <textarea rows={2} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Pourquoi corriger la note automatique ?" />
      <div className="flex items-center justify-between gap-3"><Message m={msg} /><Button loading={pending} disabled={delta === 0 || reason.trim().length < 3} onClick={send} className="ml-auto">Appliquer</Button></div>
    </div>
  );
}

export function DecisionPanel({ id }: { id: string }) {
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const go = (d: "accept" | "decline") => {
    if (!window.confirm(d === "accept" ? "Présélectionner ce candidat ? Cette décision est définitive." : "Refuser ce candidat ? Cette décision est définitive.")) return;
    start(async () => { const r = await decide(id, d, note); setMsg(r.ok ? null : { ok: false, text: r.error }); });
  };
  return (
    <Card title="Décision" desc="Définitive : la candidature quitte la file d'examen.">
      <textarea rows={2} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motif ou prochaines étapes (optionnel)" />
      <div className="mt-3 flex gap-2">
        <button disabled={pending} onClick={() => go("accept")} className="h-11 flex-1 rounded-xl bg-green-600 text-sm font-medium text-white transition-colors hover:bg-green-500 disabled:opacity-60">Présélectionner</button>
        <button disabled={pending} onClick={() => go("decline")} className="h-11 flex-1 rounded-xl bg-brand-500 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-60">Refuser</button>
      </div>
      <div className="mt-2"><Message m={msg} /></div>
    </Card>
  );
}
