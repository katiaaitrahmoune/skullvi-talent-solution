"use client";

import { TextField } from "@/components/ui/fields";
import { SkillsField } from "@/components/ui/SkillsInput";

export function SkillsStep() {
  return (
    <div className="space-y-6">
      <SkillsField />
      <div className="space-y-2">
        <p className="pl-1 text-xs font-medium text-ink">Liens (facultatif)</p>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <TextField name="github" label="GitHub" type="url" inputMode="url" />
          <TextField name="portfolio" label="Portfolio" type="url" inputMode="url" />
        </div>
        <TextField name="linkedin" label="LinkedIn" type="url" inputMode="url" className="sm:max-w-[calc(50%-0.5rem)]" />
      </div>
    </div>
  );
}
