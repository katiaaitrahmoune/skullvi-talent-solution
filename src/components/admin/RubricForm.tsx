"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { CRITERIA, CRITERION_HINT, CRITERION_LABEL, EDUCATION_LEVELS } from "@/lib/labels";
import type { EducationLevel, Knockout, Rubric } from "@/lib/admin-types";
import { saveRubric } from "@/app/admin/actions";
import { Card, Field, inputCls } from "./ui";
import { TagEditor } from "./editors";

export function RubricForm({ postId, initial, version, applicationsScored }: { postId: string; initial: Rubric; version: number; applicationsScored: number }) {
  const router = useRouter();
  const [r, setR] = useState<Rubric>(initial);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [pending, start] = useTransition();
  const total = CRITERIA.reduce((s, k) => s + (Number(r.weights[k]) || 0), 0);
  const setKo = (i: number, k: Knockout) => setR({ ...r, knockouts: r.knockouts.map((x, j) => (j === i ? k : x)) });
  const addKo = (type: Knockout["type"]) => {
    const fresh: Record<Knockout["type"], Knockout> = {
      min_education: { type: "min_education", level: "bac" }, required_skills: { type: "required_skills", skills: [], mode: "all" },
      language: { type: "language", language: "français" }, country_in: { type: "country_in", countries: [] },
    };
    setR({ ...r, knockouts: [...r.knockouts, fresh[type]] });
  };

  function submit() {
    setError(""); setDone("");
    start(async () => {
      const res = await saveRubric(postId, r);
      if (res.ok) { setDone(`Version ${(res as { version: number }).version} enregistrée. ${(res as { rescored: number }).rescored} candidature(s) re-notée(s).`); router.refresh(); }
      else setError(res.issues ? Object.entries(res.issues).map(([k, m]) => `${k} : ${m}`).join(" · ") : res.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-4 text-sm text-muted">
        Grille actuelle : <b className="text-ink">version {version}</b>. Enregistrer crée la version {version + 1} et <b className="text-ink">re-note automatiquement les {applicationsScored} candidature(s) pas encore en revue</b>. Celles déjà examinées gardent la note sur laquelle elles ont été jugées.
      </div>

      <Card title="Poids des critères" desc="La note de chaque candidat est calculée automatiquement avec ces six critères. Le total doit faire 100.">
        <div className="space-y-3">
          {CRITERIA.map((k) => (
            <div key={k} className="grid items-center gap-3 sm:grid-cols-[180px_1fr_90px]">
              <div><p className="text-sm font-medium">{CRITERION_LABEL[k]}</p></div>
              <p className="text-xs text-muted">{CRITERION_HINT[k]}</p>
              <input aria-label={`Poids ${CRITERION_LABEL[k]}`} type="number" min={0} max={100} className={inputCls} value={r.weights[k]} onChange={(e) => setR({ ...r, weights: { ...r.weights, [k]: Number(e.target.value) } })} />
            </div>
          ))}
          <p className={cn("text-right text-sm font-semibold", total === 100 ? "text-green-600" : "text-danger")}>Total : {total} / 100</p>
        </div>
      </Card>

      <Card title="Mots-clés de compétences" desc="Un mot-clé listé par le candidat vaut 1, trouvé seulement dans son projet ou son expérience 0,6.">
        <div className="space-y-5">
          <TagEditor label="Requises (70 %)" items={r.skills.required} onChange={(l) => setR({ ...r, skills: { ...r.skills, required: l } })} />
          <TagEditor label="Appréciées (30 %)" items={r.skills.preferred} onChange={(l) => setR({ ...r, skills: { ...r.skills, preferred: l } })} />
        </div>
      </Card>

      <Card title="Critères éliminatoires" desc="Un candidat qui échoue à l'un d'eux devient « Non éligible » et n'est pas noté.">
        <div className="space-y-3">
          {r.knockouts.map((k, i) => (
            <div key={i} className="flex flex-wrap items-start gap-3 rounded-xl border border-line p-3">
              <div className="min-w-[220px] flex-1">
                {k.type === "min_education" && (
                  <Field label="Niveau d'études minimum (obtenu)"><select className={inputCls} value={k.level} onChange={(e) => setKo(i, { ...k, level: e.target.value as EducationLevel })}>{EDUCATION_LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
                )}
                {k.type === "required_skills" && (
                  <div className="space-y-3">
                    <TagEditor label="Compétences indispensables" items={k.skills} onChange={(l) => setKo(i, { ...k, skills: l })} />
                    <Field label="Il faut"><select className={inputCls} value={k.mode} onChange={(e) => setKo(i, { ...k, mode: e.target.value as "all" | "any" })}><option value="all">Toutes</option><option value="any">Au moins une</option></select></Field>
                  </div>
                )}
                {k.type === "language" && <Field label="Langue indispensable"><input className={inputCls} value={k.language} onChange={(e) => setKo(i, { ...k, language: e.target.value })} /></Field>}
                {k.type === "country_in" && <TagEditor label="Pays acceptés" items={k.countries} onChange={(l) => setKo(i, { ...k, countries: l })} />}
              </div>
              <button type="button" aria-label="Supprimer ce critère" onClick={() => setR({ ...r, knockouts: r.knockouts.filter((_, j) => j !== i) })} className="mt-6 grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-brand-50 hover:text-brand-700"><X className="h-4 w-4" /></button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {([["min_education", "+ Niveau d'études"], ["required_skills", "+ Compétences"], ["language", "+ Langue"], ["country_in", "+ Pays"]] as const).map(([t, l]) => (
              <Button key={t} type="button" variant="ghost" className="h-10" onClick={() => addKo(t)}>{l}</Button>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Réglages conservés" desc="Paliers d'expérience et table des diplômes : repris tels quels de la version actuelle. Les seuils des tiers viennent de la configuration du serveur.">
        <p className="text-sm text-muted">{r.experienceTable.length} paliers d'expérience · {r.educationRules.length} règles de diplômes{r.tiers ? ` · tiers personnalisés (${r.tiers.map((t) => `${t.tier} ≥ ${t.min}`).join(", ")})` : ""}</p>
      </Card>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm font-medium text-danger">{error}</p>}
      {done && <p role="status" className="rounded-xl bg-green-500/10 p-3 text-sm font-medium text-green-600">{done}</p>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Retour</Button>
        <Button type="button" loading={pending} disabled={total !== 100} onClick={submit}>Enregistrer une nouvelle version</Button>
      </div>
    </div>
  );
}
