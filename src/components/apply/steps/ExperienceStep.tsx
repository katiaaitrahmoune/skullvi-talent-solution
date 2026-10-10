"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { CheckboxField, DateField, TextAreaField, TextField } from "@/components/ui/fields";
import { FileAttach } from "@/components/ui/FileAttach";
import { EMPTY_CERTIFICATE, EMPTY_EXPERIENCE, type ApplicationValues } from "@/lib/schema";

const addBtn =
  "inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-4 py-2 text-sm text-muted hover:border-brand-500 hover:text-brand-600";

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-xs text-muted hover:text-danger">
      <Trash2 className="h-3.5 w-3.5" aria-hidden /> Supprimer
    </button>
  );
}

function ExperienceList() {
  const { control, watch } = useFormContext<ApplicationValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "experience" });

  return (
    <section aria-labelledby="exp-title" className="space-y-4">
      <div>
        <h2 id="exp-title" className="text-sm font-semibold">Expériences</h2>
        {fields.length === 0 && (
          <p className="mt-1 text-sm text-muted">
            Pas encore d&apos;expérience ? Ce n&apos;est pas grave. Vous pouvez passer, ou ajouter un stage, du bénévolat ou un projet freelance.
          </p>
        )}
      </div>
      {fields.map((f, i) => {
        const ongoing = watch(`experience.${i}.ongoing`);
        return (
          <fieldset key={f.id} className="rounded-2xl border border-line p-5">
            <div className="mb-3 flex items-center justify-between">
              <legend className="text-sm font-semibold">Expérience {i + 1}</legend>
              <RemoveButton onClick={() => remove(i)} />
            </div>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <TextField name={`experience.${i}.role`} label="Poste / rôle" />
              <TextField name={`experience.${i}.company`} label="Entreprise / organisation" />
            </div>
            <div className="mt-1 grid items-start gap-x-4 sm:grid-cols-2">
              <DateField name={`experience.${i}.startDate`} label="Début" />
              <DateField name={`experience.${i}.endDate`} label="Fin" disabled={ongoing} />
            </div>
            <CheckboxField name={`experience.${i}.ongoing`}>En cours</CheckboxField>
            <div className="mt-4">
              <TextAreaField name={`experience.${i}.description`} label="Ce que vous avez fait (facultatif)" max={400} />
            </div>
          </fieldset>
        );
      })}
      <button type="button" onClick={() => append(EMPTY_EXPERIENCE)} className={addBtn}>
        <Plus className="h-4 w-4" aria-hidden /> Ajouter une expérience
      </button>
    </section>
  );
}

function CertificateList() {
  const { control } = useFormContext<ApplicationValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "certificates" });

  return (
    <section aria-labelledby="cert-title" className="space-y-4">
      <div>
        <h2 id="cert-title" className="text-sm font-semibold">Certificats</h2>
        {fields.length === 0 && (
          <p className="mt-1 text-sm text-muted">Coursera, OpenClassrooms, Google, Cisco, une attestation de formation… Facultatif.</p>
        )}
      </div>
      {fields.map((f, i) => (
        <fieldset key={f.id} className="rounded-2xl border border-line p-5">
          <div className="mb-3 flex items-center justify-between">
            <legend className="text-sm font-semibold">Certificat {i + 1}</legend>
            <RemoveButton onClick={() => remove(i)} />
          </div>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <TextField name={`certificates.${i}.name`} label="Nom du certificat" />
            <TextField name={`certificates.${i}.issuer`} label="Organisme" />
          </div>
          <div className="mt-1 grid items-start gap-x-4 sm:grid-cols-2">
            <DateField name={`certificates.${i}.date`} label="Obtenu en" />
            <TextField name={`certificates.${i}.url`} label="Lien de vérification (facultatif)" type="url" inputMode="url" />
          </div>
          <FileAttach name={`certificates.${i}.file`} label="Joindre le certificat" />
        </fieldset>
      ))}
      <button type="button" onClick={() => append(EMPTY_CERTIFICATE)} className={addBtn}>
        <Plus className="h-4 w-4" aria-hidden /> Ajouter un certificat
      </button>
    </section>
  );
}

export function ExperienceStep() {
  return (
    <div className="space-y-10">
      <ExperienceList />
      <CertificateList />
    </div>
  );
}
