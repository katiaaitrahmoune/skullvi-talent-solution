"use client";

import { SelectField, TextAreaField, TextField } from "@/components/ui/fields";
import { AVAILABILITY, HEARD, WORK_MODE, YES_NO } from "@/lib/options";

// The questions asked of every candidate, whatever the offer.
export function QuestionsStep() {
  return (
    <div className="space-y-2">
      <div className="grid gap-x-4 sm:grid-cols-2">
        <SelectField name="availability" label="Quand pouvez-vous commencer ?" options={AVAILABILITY} />
        <SelectField name="workMode" label="Mode de travail souhaité" options={WORK_MODE} />
      </div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <SelectField name="relocation" label="Prêt(e) à vous déplacer ?" options={YES_NO} />
        <SelectField name="heardFrom" label="Comment nous avez-vous connus ?" options={HEARD} />
      </div>
      <TextField name="languages" label="Langues parlées" hint="Exemple : Français (natif), Anglais (intermédiaire)" />
      <TextAreaField name="expectations" label="Attentes ou remarques (facultatif)" max={500} />
    </div>
  );
}
