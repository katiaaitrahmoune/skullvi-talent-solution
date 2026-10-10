"use client";

import { useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { KeyRound, UserCheck, UserX } from "lucide-react";
import { createUser, updateUser, type Result } from "@/app/admin/actions";
import { Field, inputCls } from "./ui";

function Submit() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="h-[42px] rounded-xl bg-brand-500 px-5 text-[15px] font-medium text-white hover:bg-brand-600 disabled:opacity-60">{pending ? "Création…" : "Créer le compte"}</button>;
}

export function AddUserForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(async (p: Result | undefined, fd: FormData) => {
    const r = await createUser(p, fd);
    if (r.ok) ref.current?.reset();
    return r;
  }, undefined);
  return (
    <form ref={ref} action={action} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_140px_auto]">
      <Field label="Nom complet"><input name="name" required className={inputCls} /></Field>
      <Field label="E-mail"><input name="email" type="email" required className={inputCls} /></Field>
      <Field label="Mot de passe" hint="10 caractères minimum"><input name="password" type="text" required minLength={10} autoComplete="off" className={inputCls} /></Field>
      <Field label="Rôle"><select name="role" className={inputCls} defaultValue="reviewer"><option value="reviewer">Réviseur</option><option value="admin">Admin</option></select></Field>
      <Submit />
      {state && !state.ok && <p role="alert" className="text-sm font-medium text-danger sm:col-span-full">{state.issues ? Object.values(state.issues).join(" · ") : state.error}</p>}
      {state?.ok && <p role="status" className="text-sm font-medium text-green-600 sm:col-span-full">Compte créé. Transmettez-lui son mot de passe de façon sûre.</p>}
    </form>
  );
}

export function UserActions({ id, active, self }: { id: string; active: boolean; self: boolean }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const toggle = () => start(async () => { const r = await updateUser(id, { active: !active }); setMsg(r.ok ? "" : r.error); });
  const reset = () => {
    const password = window.prompt("Nouveau mot de passe (10 caractères minimum) :");
    if (!password) return;
    start(async () => { const r = await updateUser(id, { password }); setMsg(r.ok ? "Mot de passe changé." : r.issues?.password ?? r.error); });
  };
  return (
    <div className="flex items-center justify-end gap-1">
      {msg && <span className="mr-2 text-xs text-muted">{msg}</span>}
      <button disabled={pending} onClick={reset} title="Nouveau mot de passe" aria-label="Nouveau mot de passe" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-page hover:text-ink"><KeyRound className="h-4 w-4" /></button>
      {!self && <button disabled={pending} onClick={toggle} title={active ? "Désactiver" : "Réactiver"} aria-label={active ? "Désactiver" : "Réactiver"} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-page hover:text-ink">{active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}</button>}
    </div>
  );
}
