"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { decide } from "@/app/admin/actions";
import { inputCls } from "@/components/admin/ui";

// The only choice a reviewer makes: invite to interview, or not. Both are final.
function useDecide(id: string, name: string, note: () => string) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const go = (d: "accept" | "decline") => {
    const q = d === "accept" ? `Inviter ${name} en entretien ?` : `Ne pas retenir ${name} ? Cette décision est définitive.`;
    if (!window.confirm(q)) return;
    setError("");
    start(async () => {
      const r = await decide(id, d, note());
      if (!r.ok) setError(r.error);
    });
  };
  return { go, pending, error };
}

export function QuickDecision({ id, name }: { id: string; name: string }) {
  const { go, pending, error } = useDecide(id, name, () => "");
  return (
    <div className="flex flex-col gap-2 sm:w-44">
      <button disabled={pending} onClick={() => go("accept")} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-medium text-white transition-colors hover:bg-green-500 disabled:opacity-60">
        <Check className="h-4 w-4" aria-hidden />Entretien
      </button>
      <button disabled={pending} onClick={() => go("decline")} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-medium transition-colors hover:border-ink/30 disabled:opacity-60">
        <X className="h-4 w-4" aria-hidden />Non retenu
      </button>
      {error && <p role="alert" className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

export function InterviewDecision({ id, name }: { id: string; name: string }) {
  const [note, setNote] = useState("");
  const { go, pending, error } = useDecide(id, name, () => note);
  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Commentaire (optionnel)</span>
        <textarea rows={3} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pourquoi ce choix ? Questions à poser en entretien…" />
      </label>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button disabled={pending} onClick={() => go("accept")} className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-green-600 text-[15px] font-medium text-white transition-colors hover:bg-green-500 disabled:opacity-60")}>
          <Check className="h-4 w-4" aria-hidden />Inviter en entretien
        </button>
        <button disabled={pending} onClick={() => go("decline")} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white text-[15px] font-medium transition-colors hover:border-ink/30 disabled:opacity-60">
          <X className="h-4 w-4" aria-hidden />Ne pas retenir
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
