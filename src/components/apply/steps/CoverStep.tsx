"use client";

import { CheckboxField, TextAreaField } from "@/components/ui/fields";

export function CoverStep() {
  return (
    <div className="space-y-4">
      <TextAreaField
        name="coverLetter"
        label="Votre lettre de motivation"
        max={2500}
        tall
        hint="Qui vous êtes, ce que vous avez réalisé, ce que vous voulez apporter. Minimum 150 caractères."
      />
      <CheckboxField name="consent">
        J&apos;accepte que SKULLVI traite mes données pour évaluer ma candidature. Un score automatique peut aider à
        prioriser les dossiers, mais une personne prend la décision finale.
      </CheckboxField>
    </div>
  );
}
