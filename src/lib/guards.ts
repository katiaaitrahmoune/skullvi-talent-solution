import { notFound, redirect } from "next/navigation";
import { me, StaffApiError } from "./staff-api";

export async function requireAdmin() {
  const user = await me();
  if (user.role !== "admin") redirect("/admin");
  return user;
}

/** Turn a backend 404/403 into the matching Next.js page; anything else bubbles up to the error boundary. */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof StaffApiError) {
      if (e.status === 404) notFound();
      if (e.status === 403) redirect("/admin");
    }
    throw e;
  }
}
