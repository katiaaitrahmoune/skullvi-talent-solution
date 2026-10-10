"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputCls } from "./ui";

export function ListEditor({ label, items, onChange, placeholder, error }: { label: string; items: string[]; onChange: (l: string[]) => void; placeholder?: string; error?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => { const t = draft.trim(); if (t) { onChange([...items, t]); setDraft(""); } };
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <ul className="mb-2 space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2 rounded-lg bg-page px-3 py-2 text-sm">
            <span className="flex-1">{it}</span>
            <button type="button" aria-label={`Retirer : ${it}`} onClick={() => onChange(items.filter((_, k) => k !== i))} className="text-muted hover:text-brand-700"><X className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input className={inputCls} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Button type="button" variant="dark" className="h-[42px] px-4" onClick={add}>Ajouter</Button>
      </div>
      {error && <p role="alert" className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

export function TagEditor({ label, hint, items, onChange, error }: { label: string; hint?: string; items: string[]; onChange: (l: string[]) => void; error?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim().replace(/,$/, "");
    if (t && !items.some((x) => x.toLowerCase() === t.toLowerCase())) onChange([...items, t]);
    setDraft("");
  };
  const key = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    else if (e.key === "Backspace" && !draft && items.length) onChange(items.slice(0, -1));
  };
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
        {items.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
            {t}
            <button type="button" aria-label={`Retirer ${t}`} onClick={() => onChange(items.filter((x) => x !== t))}><X className="h-3.5 w-3.5" /></button>
          </span>
        ))}
        <input className="min-w-[140px] flex-1 bg-transparent px-1 py-1 text-[15px] outline-none" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={key} onBlur={add} placeholder="Ajouter…" />
      </div>
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
