// `npm run db:seed`       -> first admin from ADMIN_EMAIL / ADMIN_PASSWORD
// `npm run db:seed:demo`  -> + two reviewers and an open demo post
import { randomBytes } from "node:crypto";
import { env } from "../config/env.ts";
import { defaultRubric } from "../domain/defaults.ts";
import { createPost, setPostStatus, setReviewers } from "../services/posts.ts";
import { createUser, listUsers } from "../services/users.ts";
import { migrate } from "./migrate.ts";
import { pool } from "./pool.ts";

await migrate();
const users = await listUsers();
let admin = users.find((u) => u.role === "admin");
if (!admin) {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) { console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ chars) in .env first."); process.exit(1); }
  admin = await createUser(null, { name: "Administrateur", email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, role: "admin" });
  console.log(`Admin created: ${admin.email}`);
} else console.log(`Admin already exists: ${admin.email}`);

if (process.argv.includes("--demo")) {
  const actor = { id: admin.id, email: admin.email, name: admin.name, role: "admin" as const };
  const reviewers = [];
  for (const [name, email] of [["Amina Diallo (démo)", "amina.demo@example.org"], ["Koffi Mensah (démo)", "koffi.demo@example.org"]] as const) {
    const existing = users.find((u) => u.email === email);
    if (existing) { reviewers.push(existing); continue; }
    const password = randomBytes(9).toString("base64url");
    reviewers.push(await createUser(actor, { name, email, password, role: "reviewer" }));
    console.log(`Reviewer ${email}  password: ${password}   (shown once)`);
  }
  const id = await createPost(actor, {
    title: "Programme développeurs SKULLVI (démo)", organisation: "SKULLVI",
    summary: "Programme de formation et de mise en situation pour jeunes développeurs.",
    description: "Programme de formation et de mise en situation réelle pour de jeunes développeurs. Les participants travaillent sur des fonctionnalités de la plateforme SKULLVI, encadrés par des tuteurs.",
    type: "Programme", mode: "À distance", location: "Afrique francophone", deadline: "2026-12-31", startDate: "2027-01-15", infoSession: "", seats: 10,
    minEducation: "Baccalauréat", languages: "Français (obligatoire), anglais (un plus)",
    missions: ["Développer des fonctionnalités web", "Écrire des tests et documenter"], mustHave: ["Au moins un projet terminé", "Disponible 15 h par semaine"], niceToHave: ["Git en équipe"],
    autoQueue: true,
    rubric: { ...defaultRubric({ required: ["JavaScript", "Git", "SQL"], preferred: ["React", "Python", "TypeScript", "Docker"] }), knockouts: [{ type: "language", language: "français" }] },
  });
  await setReviewers(actor, id, reviewers.map((r) => r.id));
  await setPostStatus(actor, id, "open");
  console.log(`Demo post created and published: ${id}`);
}
await pool.end();
