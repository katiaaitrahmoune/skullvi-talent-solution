"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { CheckboxField, DateField, TextField } from "@/components/ui/fields";
import { FileAttach } from "@/components/ui/FileAttach";
import { EMPTY_EDUCATION, type ApplicationValues } from "@/lib/schema";

// Education history: each entry has a start date, an end date (or "ongoing") and a supporting file.
export function ProfileStep() {
  const { control, watch, formState: { errors } } = useFormContext<ApplicationValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "education" });
  const listError = (errors.education as { message?: string; root?: { message?: string } } | undefined);

  return (
    <div className="space-y-5">
      {fields.map((f, i) => {
        const ongoing = watch(`education.${i}.ongoing`);
        return (
          <fieldset key={f.id} className="rounded-2xl border border-line p-5">
            <div className="mb-3 flex items-center justify-between">
              <legend className="text-sm font-semibold">Formation {i + 1}</legend>
              {fields.length > 1 && (
                <button type="button" onClick={() => remove(i)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Supprimer
                </button>
              )}
            </div>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <TextField name={`education.${i}.degree`} label="Diplôme / filière" />
              <TextField name={`education.${i}.institution`} label="Établissement" />
            </div>
            <div className="mt-1 grid items-start gap-x-4 sm:grid-cols-2">
              <DateField name={`education.${i}.startDate`} label="Début" />
              <DateField name={`education.${i}.endDate`} label="Fin" disabled={ongoing} />
            </div>
            <CheckboxField name={`education.${i}.ongoing`}>En cours</CheckboxField>
            <FileAttach name={`education.${i}.file`} label="Joindre un justificatif (diplôme, attestation)" />
          </fieldset>
        );
      })}
      {listError?.message && <p role="alert" className="text-xs text-danger">{listError.message}</p>}
      <button
        type="button"
        onClick={() => append(EMPTY_EDUCATION)}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-4 py-2 text-sm text-muted hover:border-brand-500 hover:text-brand-600"
      >
        <Plus className="h-4 w-4" aria-hidden /> Ajouter une formation
      </button>
    </div>
  );
}
