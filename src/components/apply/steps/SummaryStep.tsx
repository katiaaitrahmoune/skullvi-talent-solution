"use client";

import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { useFormContext } from "react-hook-form";
import type { StepId } from "@/lib/copy";
import type { ApplicationValues } from "@/lib/schema";

function Section({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50">
          <Pencil className="h-3 w-3" aria-hidden /> Modifier<span className="sr-only"> {title}</span>
        </button>
      </div>
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Row({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line break-words">{children || "—"}</dd>
    </div>
  );
}

const month = (m: string) => (m ? new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(new Date(`${m}-01`)) : "");

export function SummaryStep({ onEdit }: { onEdit: (step: StepId) => void }) {
  const v = useFormContext<ApplicationValues>().getValues();
  return (
    <div className="space-y-4">
      <Section title="Informations" onEdit={() => onEdit("cv")}>
        <Row label="Nom">{`${v.firstName} ${v.lastName}`}</Row>
        <Row label="E-mail">{v.email}</Row>
        <Row label="Téléphone">{v.phone}</Row>
        <Row label="Localisation">{`${v.city}, ${v.country}`}</Row>
        <Row label="CV" wide>{v.cvFile?.name}</Row>
      </Section>
      <Section title="Formation" onEdit={() => onEdit("education")}>
        {v.education.map((e, i) => (
          <Row key={i} label={`${month(e.startDate)} → ${e.ongoing ? "en cours" : month(e.endDate)}`} wide>
            {`${e.degree}, ${e.institution}${e.file ? ` · ${e.file.name}` : ""}`}
          </Row>
        ))}
      </Section>
      <Section title="Expérience" onEdit={() => onEdit("experience")}>
        {v.experience.length === 0 && <Row label="Expériences" wide>Aucune</Row>}
        {v.experience.map((e, i) => (
          <Row key={i} label={`${month(e.startDate)} → ${e.ongoing ? "en cours" : month(e.endDate)}`} wide>
            {`${e.role}, ${e.company}${e.description ? `\n${e.description}` : ""}`}
          </Row>
        ))}
      </Section>
      <Section title="Certificats" onEdit={() => onEdit("experience")}>
        {v.certificates.length === 0 && <Row label="Certificats" wide>Aucun</Row>}
        {v.certificates.map((c, i) => (
          <Row key={i} label={month(c.date)} wide>
            {`${c.name}, ${c.issuer}${c.file ? ` · ${c.file.name}` : ""}`}
          </Row>
        ))}
      </Section>
      <Section title="Compétences" onEdit={() => onEdit("skills")}>
        <Row label="Compétences" wide>
          <span className="flex flex-wrap gap-1.5">
            {v.skills.map((s) => (
              <span key={s} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{s}</span>
            ))}
          </span>
        </Row>
        <Row label="GitHub">{v.github}</Row>
        <Row label="Portfolio">{v.portfolio}</Row>
        <Row label="LinkedIn">{v.linkedin}</Row>
      </Section>
      <Section title="Projet" onEdit={() => onEdit("project")}>
        <Row label="Nom du projet">{v.projectTitle}</Row>
        <Row label="Lien">{v.projectLink}</Row>
        <Row label="Le projet et pourquoi vous en êtes fier" wide>{v.projectProud}</Row>
        <Row label="Difficulté rencontrée" wide>{v.projectChallenge}</Row>
        <Row label="Solution" wide>{v.projectSolution}</Row>
      </Section>
      <Section title="Questions générales" onEdit={() => onEdit("questions")}>
        <Row label="Disponibilité">{v.availability}</Row>
        <Row label="Mode de travail">{v.workMode}</Row>
        <Row label="Déplacement">{v.relocation}</Row>
        <Row label="Source">{v.heardFrom}</Row>
        <Row label="Langues" wide>{v.languages}</Row>
        <Row label="Remarques" wide>{v.expectations}</Row>
      </Section>
      <Section title="Lettre de motivation" onEdit={() => onEdit("cover")}>
        <Row label="Lettre" wide>{v.coverLetter}</Row>
      </Section>
    </div>
  );
}
