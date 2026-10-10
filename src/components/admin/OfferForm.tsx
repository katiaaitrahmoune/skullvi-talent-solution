"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MIN_EDUCATION, POST_MODES, POST_TYPES } from "@/lib/rubric-defaults";
import type { StaffPost } from "@/lib/admin-types";
import { createOffer, updateOffer, type OfferInput } from "@/app/admin/actions";
import { Card, Field, inputCls } from "./ui";
import { ListEditor, TagEditor } from "./editors";

const EMPTY: OfferInput = {
  title: "", organisation: "SKULLVI", summary: "", description: "", type: "Programme", mode: "À distance", location: "",
  deadline: "", startDate: "", infoSession: "", seats: 1, minEducation: "Aucun prérequis", languages: "Français",
  missions: [], mustHave: [], niceToHave: [], autoQueue: true,
};

export function OfferForm({ initial }: { initial?: StaffPost }) {
  const router = useRouter();
  const [v, setV] = useState<OfferInput>(initial ? { ...EMPTY, ...initial } : EMPTY);
  const [required, setRequired] = useState<string[]>([]);
  const [preferred, setPreferred] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [top, setTop] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof OfferInput>(k: K, val: OfferInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const err = (k: string) => errors[k];

  function submit() {
    setErrors({}); setTop("");
    start(async () => {
      const payload: OfferInput = { title: v.title, organisation: v.organisation, summary: v.summary, description: v.description, type: v.type, mode: v.mode, location: v.location, deadline: v.deadline, startDate: v.startDate, infoSession: v.infoSession, seats: v.seats, minEducation: v.minEducation, languages: v.languages, missions: v.missions, mustHave: v.mustHave, niceToHave: v.niceToHave, autoQueue: v.autoQueue };
      const res = initial ? await updateOffer(initial.id, payload) : await createOffer({ ...payload, requiredSkills: required, preferredSkills: preferred });
      if (res.ok) return router.push(`/admin/offers/${"id" in res ? res.id : initial?.id}`);
      setErrors(res.issues ?? {});
      setTop(res.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return (
    <div className="space-y-6">
      {(top || Object.keys(errors).length > 0) && (
        <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          <p className="font-semibold">{top || "Corrigez les champs suivants :"}</p>
          {Object.keys(errors).length > 0 && <ul className="mt-1 list-disc pl-5">{Object.entries(errors).map(([k, m]) => <li key={k}>{k} : {m}</li>)}</ul>}
        </div>
      )}

      <Card title="1. L'offre en bref" desc="Ce que les candidats voient en premier.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre" error={err("title")} className="sm:col-span-2"><input className={inputCls} value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex. Développeur web junior" /></Field>
          <Field label="Organisation" error={err("organisation")}><input className={inputCls} value={v.organisation} onChange={(e) => set("organisation", e.target.value)} /></Field>
          <Field label="Lieu" error={err("location")}><input className={inputCls} value={v.location} onChange={(e) => set("location", e.target.value)} placeholder="Ex. Lomé, Togo" /></Field>
          <Field label="Type"><select className={inputCls} value={v.type} onChange={(e) => set("type", e.target.value)}>{POST_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Mode de travail"><select className={inputCls} value={v.mode} onChange={(e) => set("mode", e.target.value)}>{POST_MODES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Résumé en une phrase" hint={`${v.summary.length}/220`} error={err("summary")} className="sm:col-span-2">
            <textarea rows={2} maxLength={220} className={inputCls} value={v.summary} onChange={(e) => set("summary", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card title="2. Description du poste" desc="Les réviseurs relisent ce texte pour juger les candidatures.">
        <div className="space-y-5">
          <Field label="Description détaillée" error={err("description")}><textarea rows={6} className={inputCls} value={v.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <ListEditor label="Missions principales" items={v.missions} onChange={(l) => set("missions", l)} placeholder="Ex. Développer des fonctionnalités web" error={err("missions")} />
        </div>
      </Card>

      <Card title="3. Profil recherché" desc="Affiché aux candidats. Les critères de notation automatique se règlent dans « Grille de notation ».">
        <div className="space-y-5">
          <ListEditor label="Indispensable" items={v.mustHave} onChange={(l) => set("mustHave", l)} placeholder="Ex. Disponible 15 h par semaine" error={err("mustHave")} />
          <ListEditor label="Un plus" items={v.niceToHave} onChange={(l) => set("niceToHave", l)} placeholder="Ex. Contribution open source" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Niveau d'études conseillé"><select className={inputCls} value={v.minEducation} onChange={(e) => set("minEducation", e.target.value)}>{MIN_EDUCATION.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Langues attendues" error={err("languages")}><input className={inputCls} value={v.languages} onChange={(e) => set("languages", e.target.value)} /></Field>
          </div>
          {!initial && (
            <div className="space-y-5 rounded-xl bg-page p-4">
              <p className="text-sm text-muted">Mots-clés pour la notation automatique des compétences (modifiables ensuite dans la grille) :</p>
              <TagEditor label="Compétences requises" hint="Entrée ou virgule pour ajouter. Comptent pour 70 % du score « Compétences »." items={required} onChange={setRequired} />
              <TagEditor label="Compétences appréciées" hint="Comptent pour 30 %." items={preferred} onChange={setPreferred} />
            </div>
          )}
        </div>
      </Card>

      <Card title="4. Calendrier et traitement">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Date limite" error={err("deadline")}><input type="date" className={inputCls} value={v.deadline} onChange={(e) => set("deadline", e.target.value)} /></Field>
          <Field label="Séance d'information" hint="Optionnel" error={err("infoSession")}><input type="date" className={inputCls} value={v.infoSession} onChange={(e) => set("infoSession", e.target.value)} /></Field>
          <Field label="Date de début" error={err("startDate")}><input type="date" className={inputCls} value={v.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
          <Field label="Places" error={err("seats")}><input type="number" min={1} className={inputCls} value={v.seats} onChange={(e) => set("seats", Number(e.target.value))} /></Field>
        </div>
        <label className="mt-5 flex items-start gap-3 rounded-xl border border-line p-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[rgb(var(--brand-500))]" checked={v.autoQueue} onChange={(e) => set("autoQueue", e.target.checked)} />
          <span><b>Envoyer automatiquement en revue</b><br /><span className="text-muted">Les candidatures notées arrivent tout de suite chez les réviseurs. Décochez pour les libérer vous-même, en une fois.</span></span>
        </label>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Annuler</Button>
        <Button type="button" loading={pending} onClick={submit}>{initial ? "Enregistrer" : "Créer l'offre (brouillon)"}</Button>
      </div>
    </div>
  );
}
