"use client";

import { SelectField, TextField } from "@/components/ui/fields";
import { COUNTRIES } from "@/lib/options";

export function PersonalStep() {
  return (
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
  );
}
