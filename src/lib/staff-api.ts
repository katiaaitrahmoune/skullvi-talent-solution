// Server-only helper: calls the backend /api/staff/* with the admin's token (kept in an httpOnly cookie, never exposed to the browser JS).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE, TOKEN_COOKIE } from "./config";

export class StaffApiError extends Error {
  status: number;
  code: string;
  issues?: Record<string, string>;
  constructor(status: number, code: string, message: string, issues?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

type Init = Omit<RequestInit, "body" | "headers"> & { json?: unknown; body?: BodyInit };

export async function staffFetch(path: string, init: Init = {}): Promise<Response> {
  const token = cookies().get(TOKEN_COOKIE)?.value;
  if (!token) redirect("/admin/login");
  const { json, ...rest } = init;
  const res = await fetch(`${API_BASE}/api/staff${path}`, {
    ...rest,
    headers: { authorization: `Bearer ${token}`, ...(json !== undefined ? { "content-type": "application/json" } : {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  if (res.status === 401) redirect("/admin/login?expired=1");
  return res;
}

export async function staff<T = void>(path: string, init: Init = {}): Promise<T> {
  const res = await staffFetch(path, init);
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new StaffApiError(res.status, body?.code ?? "error", body?.message ?? `Erreur ${res.status}`, body?.issues);
  return body as T;
}

export async function me() {
  const token = cookies().get(TOKEN_COOKIE)?.value;
  if (!token) redirect("/admin/login");
  const res = await fetch(`${API_BASE}/api/auth/me`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(60_000) });
  if (res.status === 401) redirect("/admin/login?expired=1");
  if (!res.ok) throw new StaffApiError(res.status, "error", "Impossible de vérifier la session.");
  return (await res.json()) as import("./admin-types").Me;
}
