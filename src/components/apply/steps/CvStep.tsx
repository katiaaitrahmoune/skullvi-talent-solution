"use client";

import { useState } from "react";
import { FileUp, Loader2, PenLine, Sparkles } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/cn";
import { SelectField, TextField } from "@/components/ui/fields";
import { COUNTRIES } from "@/lib/options";
import type { ApplicationValues } from "@/lib/schema";

const MAX_MB = 5;

export function CvStep() {
  const { watch, setValue, getValues } = useFormContext<ApplicationValues>();
  const mode = watch("cvMode");
  const file = watch("cvFile");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const pick = (f?: File) => {
    setMsg(null);
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) return setMsg({ ok: false, text: `Fichier trop lourd (max ${MAX_MB} Mo).` });
    setValue("cvFile", f);
  };

  const extract = async () => {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("cv", file);
      const res = await fetch("/api/cv/extract", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        const text = res.status === 415 ? "Format non lisible : utilisez un PDF ou un TXT, ou remplissez manuellement."
          : "Lecture impossible. Remplissez manuellement ci-dessous.";
        return setMsg({ ok: false, text });
      }
      let n = 0;
      for (const [k, v] of Object.entries(json.fields as Record<string, string | string[]>)) {
        if (k === "skills") {
          const merged = Array.from(new Set([...(getValues("skills") ?? []), ...(v as string[])]));
          setValue("skills", merged.slice(0, 15));
        } else {
          setValue(k as "email", v as string, { shouldDirty: true });
        }
        n++;
      }
      setMsg({ ok: true, text: n ? `${n} informations trouvées. Vérifiez-les et complétez ce qui manque.` : "Rien de reconnu. Remplissez manuellement." });
    } catch {
      setMsg({ ok: false, text: "Connexion impossible. Remplissez manuellement." });
    } finally {
      setBusy(false);
    }
  };

  const tab = (value: "upload" | "manual", Icon: typeof FileUp, label: string) => (
    <button
      type="button"
      onClick={() => setValue("cvMode", value)}
      aria-pressed={mode === value}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
        mode === value ? "bg-white text-brand-700 shadow-sm" : "text-muted hover:text-ink",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden /> {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-xl bg-brand-50 p-1">
        {tab("upload", FileUp, "Importer mon CV")}
        {tab("manual", PenLine, "Saisir manuellement")}
      </div>

      {mode === "upload" && (
        <div className="rounded-xl border border-dashed border-line p-5">
          <label htmlFor="cv-file" className="block cursor-pointer text-center text-sm">
            <span className="font-medium text-brand-600">{file ? file.name : "Choisir un fichier"}</span>
            <span className="mt-1 block text-xs text-muted">PDF ou TXT, {MAX_MB} Mo maximum</span>
          </label>
          <input id="cv-file" type="file" accept=".pdf,.txt,.md" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          {file && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={extract}
                disabled={busy}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
                Extraire les informations
              </button>
            </div>
          )}
          {msg && (
            <p role="status" className={cn("mt-3 text-center text-xs", msg.ok ? "text-brand-700" : "text-danger")}>{msg.text}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="grid gap-x-4 sm:grid-cols-2">
          <TextField name="firstName" label="Prénom" autoComplete="given-name" />
          <TextField name="lastName" label="Nom" autoComplete="family-name" />
        </div>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <TextField name="email" label="Adresse e-mail" type="email" autoComplete="email" inputMode="email" />
          <TextField name="phone" label="Téléphone (avec indicatif)" type="tel" autoComplete="tel" inputMode="tel" />
        </div>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <SelectField name="country" label="Pays" options={COUNTRIES} />
          <TextField name="city" label="Ville" autoComplete="address-level2" />
        </div>
      </div>
    </div>
  );
}
