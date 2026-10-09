import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.ts";
import { pool } from "../db/pool.ts";
import { HttpError, notFound } from "../http/errors.ts";
import { audit } from "./audit.ts";
import { actorOf, type AuthUser, type Role } from "./context.ts";

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(10, "10 caractères minimum").max(200),
  role: z.enum(["admin", "reviewer"]).default("reviewer"),
});
export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  active: z.boolean().optional(),
  password: z.string().min(10).max(200).optional(),
});

const publicUser = (r: Record<string, any>) => ({ id: r.id as string, email: r.email as string, name: r.name as string, role: r.role as Role, active: r.active as boolean });

// Compared against when the e-mail is unknown, so response time does not reveal which e-mails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const r = await pool.query("select * from users where email = $1", [email.trim().toLowerCase()]);
  const u = r.rows[0];
  const ok = await bcrypt.compare(password, u?.password_hash ?? DUMMY_HASH);
  if (!u || !ok || !u.active) throw new HttpError(401, "bad_credentials", "Identifiant ou mot de passe incorrect.");
  const user: AuthUser = { id: u.id, email: u.email, name: u.name, role: u.role };
  const token = jwt.sign({ role: user.role }, env.JWT_SECRET, { subject: user.id, expiresIn: "12h", algorithm: "HS256" });
  return { token, user };
}

/** Verifies the token AND re-reads the user, so deactivating an account takes effect immediately. */
export async function userFromToken(token: string): Promise<AuthUser | null> {
  try {
    const p = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    const id = typeof p === "object" ? p.sub : undefined;
    if (!id) return null;
    const r = await pool.query("select id, email, name, role, active from users where id = $1", [id]);
    return r.rows[0]?.active ? { id: r.rows[0].id, email: r.rows[0].email, name: r.rows[0].name, role: r.rows[0].role } : null;
  } catch {
    return null;
  }
}

export async function createUser(by: AuthUser | null, input: z.infer<typeof createUserSchema>) {
  const hash = await bcrypt.hash(input.password, 12);
  try {
    const r = await pool.query("insert into users (email, name, role, password_hash) values ($1, $2, $3, $4) returning *", [input.email, input.name, input.role, hash]);
    await audit(pool, { actor: by ? actorOf(by) : { id: null, label: "seed" }, action: "user.created", entityType: "user", entityId: r.rows[0].id, details: { role: input.role } });
    return publicUser(r.rows[0]);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw new HttpError(409, "email_taken", "Cet e-mail est déjà utilisé.");
    throw e;
  }
}

export async function listUsers() {
  return (await pool.query("select id, email, name, role, active from users order by role, name")).rows.map(publicUser);
}

export async function updateUser(by: AuthUser, id: string, patch: z.infer<typeof updateUserSchema>) {
  if (id === by.id && patch.active === false) throw new HttpError(409, "self_deactivate", "Vous ne pouvez pas désactiver votre propre compte.");
  const hash = patch.password ? await bcrypt.hash(patch.password, 12) : null;
  const r = await pool.query(
    `update users set name = coalesce($2, name), active = coalesce($3, active), password_hash = coalesce($4, password_hash) where id = $1 returning *`,
    [id, patch.name ?? null, patch.active ?? null, hash]);
  if (!r.rowCount) throw notFound("Utilisateur");
  await audit(pool, { actor: actorOf(by), action: "user.updated", entityType: "user", entityId: id, details: { fields: Object.keys(patch) } });
  return publicUser(r.rows[0]);
}
