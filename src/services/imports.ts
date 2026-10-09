// "Receive request: form or CSV upload" - CSV rows go through the SAME pipeline as the web form.
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { pool } from "../db/pool.ts";
import { CSV_COLUMNS, CsvFormatError, rowToSubmission, safeCell } from "../domain/csv.ts";
import { HttpError } from "../http/errors.ts";
import { audit } from "./audit.ts";
import { actorOf, type AuthUser } from "./context.ts";
import { intake, newReference, persistAndScore } from "./pipeline.ts";
import { ranking } from "./ranking.ts";

const MAX_ROWS = 500;

export type RowReport = { row: number; email: string; outcome: "accepted" | "invalid" | "duplicate" | "closed" | "error"; reference?: string; status?: string; errors?: Record<string, string> };

export async function importCsv(user: AuthUser, postId: string, filename: string, buffer: Buffer) {
  let rows: Record<string, string>[];
  try {
    rows = parse(buffer, { columns: (h: string[]) => h.map((x) => x.trim().toLowerCase()), bom: true, skip_empty_lines: true, trim: true });
  } catch (e) {
    throw new HttpError(422, "bad_csv", `CSV illisible : ${(e as Error).message}`);
  }
  if (!rows.length) throw new HttpError(422, "bad_csv", "Le fichier ne contient aucune ligne.");
  if (rows.length > MAX_ROWS) throw new HttpError(422, "too_many_rows", `${MAX_ROWS} lignes maximum par import.`);
  if (!("email" in rows[0])) throw new HttpError(422, "bad_csv", "Colonne « email » manquante. Téléchargez le modèle.");

  const actor = actorOf(user);
  const report: RowReport[] = [];
  for (const [i, row] of rows.entries()) {
    const line = i + 2; // header is line 1
    const email = (row.email ?? "").toLowerCase();
    try {
      const res = intake(rowToSubmission(row));
      if (!res.ok) {
        await audit(pool, { actor, action: "submission.invalid", entityType: "post", entityId: postId, details: { source: "csv", line, fields: Object.keys(res.errors) } });
        report.push({ row: line, email, outcome: "invalid", errors: res.errors });
        continue;
      }
      const created = await persistAndScore({ postId, data: res.data, source: "csv", reference: newReference(), files: [], actor });
      report.push({ row: line, email, outcome: "accepted", reference: created.reference, status: created.status });
    } catch (e) {
      if (e instanceof CsvFormatError) report.push({ row: line, email, outcome: "invalid", errors: { format: e.message } });
      else if (e instanceof HttpError && e.code === "duplicate") report.push({ row: line, email, outcome: "duplicate" });
      else if (e instanceof HttpError && e.code === "closed") throw e; // the whole import is pointless
      else report.push({ row: line, email, outcome: "error", errors: { server: "Erreur interne sur cette ligne." } });
    }
  }
  const accepted = report.filter((r) => r.outcome === "accepted").length;
  await pool.query("insert into imports (post_id, uploaded_by, filename, total, accepted, rejected, report) values ($1, $2, $3, $4, $5, $6, $7)",
    [postId, user.id, filename.slice(0, 200), rows.length, accepted, rows.length - accepted, JSON.stringify(report)]);
  await audit(pool, { actor, action: "import.csv", entityType: "post", entityId: postId, details: { filename, total: rows.length, accepted } });
  return { total: rows.length, accepted, rejected: rows.length - accepted, report };
}

export function csvTemplate(): string {
  const example = {
    first_name: "Yawo", last_name: "Agbeko", email: "yawo@example.org", phone: "+228 90 00 00 00", country: "Togo", city: "Lomé",
    skills: "JavaScript; React; Git; SQL", github: "https://github.com/yawo", portfolio: "", linkedin: "",
    education: "Licence en informatique@Université de Lomé:2022-10..2025-07",
    experience: "Stagiaire développeur@Agence Web:2025-06..2025-09",
    certificates: "JavaScript Algorithms@freeCodeCamp:2025-03",
    project_title: "Suivi des notes", project_link: "https://github.com/yawo/notes",
    project_proud: "Décrivez ici le projet dont vous êtes le plus fier, en au moins 80 caractères, avec ce que vous avez construit vous-même.",
    project_challenge: "Décrivez ici une difficulté rencontrée, en au moins 60 caractères, et pourquoi elle était complexe.",
    project_solution: "Décrivez ici la solution que vous avez trouvée, en au moins 60 caractères, et ce que vous en avez appris.",
    availability: "Immédiatement", work_mode: "À distance", relocation: "Non", languages: "Français, anglais", expectations: "", heard_from: "Site SKULLVI",
    cover_letter: "Remplacez ce texte par la lettre de motivation (150 caractères minimum). ".repeat(3),
  };
  return stringify([Object.fromEntries(CSV_COLUMNS.map((c) => [c, example[c]]))], { header: true, columns: [...CSV_COLUMNS], bom: true });
}

/** "Export CSV": the ranked list as shown to reviewers (all rows of the post). */
export async function exportRanking(postId: string): Promise<string> {
  const { rows } = await ranking(postId, { limit: 500, offset: 0 });
  const cols = ["rank", "reference", "first_name", "last_name", "email", "country", "city", "status", "tier", "score", "adjustment", "effective_score", "flags", "notes", "rubric_version", "submitted_at"];
  const data = rows.map((r) => [
    r.rank ?? "", r.reference, r.candidate.firstName, r.candidate.lastName, r.candidate.email, r.candidate.country, r.candidate.city, r.status,
    r.tier ?? "", r.total ?? "", r.adjustment, r.effective ?? "", r.flags.map((f) => f.code).join(";"), r.noteCount, r.rubricVersion ?? "", new Date(r.submittedAt).toISOString(),
  ].map(safeCell));
  return stringify([cols, ...data], { bom: true });
}
