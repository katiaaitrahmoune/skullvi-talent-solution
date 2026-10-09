export type Role = "admin" | "reviewer";
export type AuthUser = { id: string; email: string; name: string; role: Role };
export type Actor = { id: string | null; label: string };
export const SYSTEM: Actor = { id: null, label: "system" };
export const actorOf = (u: AuthUser): Actor => ({ id: u.id, label: `${u.role}:${u.email}` });
