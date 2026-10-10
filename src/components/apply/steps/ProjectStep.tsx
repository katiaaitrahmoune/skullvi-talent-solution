"use client";

import { TextAreaField, TextField } from "@/components/ui/fields";

// The project story: the project, a real difficulty, and how the candidate solved it.
export function ProjectStep() {
  return (
    <div className="space-y-2">
      <div className="grid gap-x-4 sm:grid-cols-2">
        <TextField name="projectTitle" label="Nom du projet" />
        <TextField name="projectLink" label="Lien : GitHub, démo (facultatif)" type="url" inputMode="url" />
      </div>
      <TextAreaField
        name="projectProud"
        label="Le projet dont vous êtes fier"
        max={800}
        hint="Ce que c'est, votre rôle, les technologies utilisées, et pourquoi il compte pour vous."
      />
      <TextAreaField
        name="projectChallenge"
        label="Une difficulté rencontrée"
        max={600}
        hint="Un vrai blocage : qu'est-ce qui ne marchait pas, et pourquoi c'était difficile ?"
      />
      <TextAreaField
        name="projectSolution"
        label="Votre solution"
        max={600}
        hint="Ce que vous avez essayé, ce qui a fonctionné, et ce que vous avez appris."
      />
    </div>
  );
}
