"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { API_BASE, TOKEN_COOKIE } from "@/lib/config";
import { staff, StaffApiError } from "@/lib/staff-api";
import type { AiRun, ImportReport, PostStatus, Rubric, StaffUser } from "@/lib/admin-types";
import { DEFAULT_RUBRIC } from "@/lib/rubric-defaults";

export type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string; issues?: Record<string, string> };
const refresh = () => revalidatePath("/admin", "layout");

/** Run a backend call and turn API errors into a form-friendly result (redirects are re-thrown untouched). */
async function run<T extends object>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    if (e instanceof StaffApiError) return { ok: false, error: e.message, issues: e.issues };
    throw e;
  }
}

// ---------- session ----------
export async function login(_: { error?: string } | undefined, fd: FormData) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST", headers: { "content-type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({ email: String(fd.get("email") ?? ""), password: String(fd.get("password") ?? "") }),
    });
  } catch {
    return { error: "Le serveur ne répond pas (il peut mettre une minute à démarrer). Réessayez." };
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) return { error: res.status === 429 ? "Trop de tentatives. Réessayez dans quelques minutes." : (body?.message ?? "Connexion impossible.") };
  cookies().set(TOKEN_COOKIE, body.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  redirect("/admin");
}

export async function logout() {
  cookies().delete(TOKEN_COOKIE);
  redirect("/admin/login");
}

// ---------- offers ----------
export type OfferInput = {
  title: string; organisation: string; summary: string; description: string; type: string; mode: string; location: string;
  deadline: string; startDate: string; infoSession: string; seats: number; minEducation: string; languages: string;
  missions: string[]; mustHave: string[]; niceToHave: string[]; autoQueue: boolean;
};

export async function createOffer(input: OfferInput & { requiredSkills: string[]; preferredSkills: string[] }) {
  const { requiredSkills, preferredSkills, ...post } = input;
  const rubric: Rubric = { ...DEFAULT_RUBRIC, skills: { required: requiredSkills, preferred: preferredSkills } };
  const r = await run(() => staff<{ id: string }>("/posts", { method: "POST", json: { ...post, rubric } }));
  if (r.ok) refresh();
  return r;
}

export async function updateOffer(id: string, input: OfferInput) {
  const r = await run(async () => { await staff(`/posts/${id}`, { method: "PATCH", json: input }); return {}; });
  if (r.ok) refresh();
  return r;
}

export async function saveRubric(id: string, rubric: Rubric) {
  const r = await run(() => staff<{ version: number; rescored: number }>(`/posts/${id}/rubric`, { method: "POST", json: rubric }));
  if (r.ok) refresh();
  return r;
}

export async function changeStatus(id: string, status: PostStatus) {
  const r = await run(async () => { await staff(`/posts/${id}/status`, { method: "POST", json: { status } }); return {}; });
  if (r.ok) refresh();
  return r;
}

export async function saveReviewers(id: string, userIds: string[]) {
  const r = await run(async () => { await staff(`/posts/${id}/reviewers`, { method: "PUT", json: { userIds } }); return {}; });
  if (r.ok) refresh();
  return r;
}

export async function queueOffer(id: string) {
  const r = await run(() => staff<{ queued: number }>(`/posts/${id}/queue`, { method: "POST" }));
  if (r.ok) refresh();
  return r;
}

export async function importCsv(_: Result<ImportReport> | undefined, fd: FormData): Promise<Result<ImportReport>> {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choisissez un fichier CSV." };
  const out = new FormData();
  out.append("postId", String(fd.get("postId")));
  out.append("consentConfirmed", fd.get("consent") === "on" ? "true" : "false");
  out.append("file", file, file.name);
  const r = await run(() => staff<ImportReport>("/imports", { method: "POST", body: out }));
  if (r.ok) refresh();
  return r;
}

// ---------- review ----------
export async function addNote(id: string, body: string) {
  const r = await run(async () => { await staff(`/applications/${id}/notes`, { method: "POST", json: { body } }); return {}; });
  if (r.ok) refresh();
  return r;
}
export async function addAdjustment(id: string, delta: number, reason: string) {
  const r = await run(async () => { await staff(`/applications/${id}/adjustments`, { method: "POST", json: { delta, reason } }); return {}; });
  if (r.ok) refresh();
  return r;
}
export async function decide(id: string, decision: "accept" | "decline", note: string) {
  const r = await run(async () => { await staff(`/applications/${id}/decision`, { method: "POST", json: { decision, note } }); return {}; });
  if (r.ok) refresh();
  return r;
}

// ---------- AI top 3 ----------
export async function runTop3(postId: string) {
  const r = await run(async () => ({ run: await staff<AiRun>(`/posts/${postId}/ai/top3`, { method: "POST" }) }));
  if (r.ok) refresh();
  return r;
}
export async function confirmTop3(runId: string, order: string[]) {
  const r = await run(async () => ({ run: await staff<AiRun>(`/ai-runs/${runId}/confirm`, { method: "POST", json: { order } }) }));
  if (r.ok) refresh();
  return r;
}

// ---------- users ----------
export async function createUser(_: Result | undefined, fd: FormData): Promise<Result> {
  const r = await run(async () => { await staff<StaffUser>("/users", { method: "POST", json: { name: fd.get("name"), email: fd.get("email"), password: fd.get("password"), role: fd.get("role") || "reviewer" } }); return {}; });
  if (r.ok) refresh();
  return r;
}
export async function updateUser(id: string, patch: { active?: boolean; password?: string }) {
  const r = await run(async () => { await staff(`/users/${id}`, { method: "PATCH", json: patch }); return {}; });
  if (r.ok) refresh();
  return r;
}
