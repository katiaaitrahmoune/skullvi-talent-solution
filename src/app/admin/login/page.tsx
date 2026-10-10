"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Logo } from "@/components/brand/Logo";
import { Field, inputCls } from "@/components/admin/ui";
import { login } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="h-12 w-full rounded-xl bg-brand-500 font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-60">
      {pending ? "Connexion… (le serveur peut mettre une minute à démarrer)" : "Se connecter"}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(login, undefined);
  return (
    <main className="grid flex-1 place-items-center bg-night px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-night-line p-8 text-white">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <h1 className="text-center text-2xl font-bold">Espace administration</h1>
        <p className="mt-1 text-center text-sm text-night-muted">Administrateurs et réviseurs SKULLVI</p>
        <form action={action} className="mt-8 text-ink">
          <div className="space-y-4 rounded-2xl bg-white p-5">
            <Field label="E-mail"><input name="email" type="email" required autoComplete="username" className={inputCls} /></Field>
            <Field label="Mot de passe" error={state?.error}>
              <input name="password" type="password" required autoComplete="current-password" className={inputCls} />
            </Field>
            <Submit />
          </div>
        </form>
      </div>
    </main>
  );
}
