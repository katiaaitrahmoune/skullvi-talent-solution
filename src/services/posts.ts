import type { PoolClient } from "pg";
import { z } from "zod";
import { pool, withTx } from "../db/pool.ts";
import { defaultRubric } from "../domain/defaults.ts";
import type { Rubric } from "../domain/types.ts";
import { forbidden, HttpError, notFound } from "../http/errors.ts";
import { audit } from "./audit.ts";
import { actorOf, type AuthUser } from "./context.ts";
import { transition } from "./pipeline.ts";
import { rubricSchema } from "./rubrics.ts";

const list = z.array(z.string().trim().min(1).max(300)).max(30);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)");

export const postFields = {
  title: z.string().trim().min(5).max(150),
  organisation: z.string().trim().min(2).max(150),
  summary: z.string().trim().min(20).max(220),
  description: z.string().trim().min(80).max(6000),
  type: z.string().trim().min(1).max(40),
  mode: z.string().trim().min(1).max(40),
  location: z.string().trim().min(2).max(120),
  deadline: day,
  startDate: day,
  infoSession: day.or(z.literal("")).optional(),
  seats: z.number().int().min(1).max(1000),
  minEducation: z.string().trim().min(1).max(60),
  languages: z.string().trim().min(2).max(200),
  missions: list.min(1),
  mustHave: list.min(1),
  niceToHave: list,
  autoQueue: z.boolean(),
};
export const createPostSchema = z.object({ ...postFields, autoQueue: postFields.autoQueue.default(true), rubric: rubricSchema.optional() });
export const updatePostSchema = z.object(postFields).partial();

const publicCols = `id, title, organisation, summary, description, type, mode, location, deadline, start_date, info_session,
  seats, min_education, languages, missions, must_have, nice_to_have`;

const shape = (r: Record<string, any>) => ({
  id: r.id, title: r.title, organisation: r.organisation, summary: r.summary, description: r.description, type: r.type, mode: r.mode,
  location: r.location, deadline: r.deadline_s, startDate: r.start_s, infoSession: r.info_s ?? "", seats: r.seats,
  minEducation: r.min_education, languages: r.languages, missions: r.missions, mustHave: r.must_have, niceToHave: r.nice_to_have,
  status: r.status, autoQueue: r.auto_queue, rubricVersion: r.current_rubric_version,
});
const dates = `to_char(deadline, 'YYYY-MM-DD') as deadline_s, to_char(start_date, 'YYYY-MM-DD') as start_s, to_char(info_session, 'YYYY-MM-DD') as info_s`;

// ---- public (candidates) ----
export async function listOpenPosts() {
  const r = await pool.query(`select ${publicCols}, status, auto_queue, current_rubric_version, ${dates} from posts where status = 'open' order by deadline`);
  return r.rows.map(publicShape);
}
export async function getOpenPost(id: string) {
  const r = await pool.query(`select ${publicCols}, status, auto_queue, current_rubric_version, ${dates} from posts where id = $1 and status = 'open'`, [id]);
  if (!r.rowCount) throw notFound("Offre");
  return publicShape(r.rows[0]);
}
// Candidates never see rubric, reviewers or scoring settings.
const publicShape = (r: Record<string, any>) => { const { status: _s, autoQueue: _a, rubricVersion: _v, ...rest } = shape(r); return rest; };

// ---- staff ----
export async function assertPostAccess(user: AuthUser, postId: string) {
  if (user.role === "admin") {
    const r = await pool.query("select 1 from posts where id = $1", [postId]);
    if (!r.rowCount) throw notFound("Offre");
    return;
  }
  const r = await pool.query("select 1 from post_reviewers where post_id = $1 and user_id = $2", [postId, user.id]);
  if (!r.rowCount) throw forbidden("Vous n'êtes pas assigné à cette offre.");
}

export async function listStaffPosts(user: AuthUser) {
  const r = await pool.query(
    `select p.id, p.title, p.status, p.type, p.mode, to_char(p.deadline, 'YYYY-MM-DD') as deadline_s, p.current_rubric_version,
       count(a.id)::int as applications,
       count(a.id) filter (where a.status in ('scored','in_review'))::int as ongoing,
       count(a.id) filter (where a.status = 'shortlisted')::int as shortlisted,
       count(a.id) filter (where a.status = 'ineligible')::int as ineligible
     from posts p left join applications a on a.post_id = p.id
     where $1 = 'admin' or exists (select 1 from post_reviewers pr where pr.post_id = p.id and pr.user_id = $2)
     group by p.id order by p.created_at desc`, [user.role, user.id]);
  return r.rows.map((x) => ({ id: x.id, title: x.title, status: x.status, type: x.type, mode: x.mode, deadline: x.deadline_s, rubricVersion: x.current_rubric_version, counts: { applications: x.applications, ongoing: x.ongoing, shortlisted: x.shortlisted, ineligible: x.ineligible } }));
}

export async function getStaffPost(user: AuthUser, id: string) {
  await assertPostAccess(user, id);
  const p = await pool.query(`select *, ${dates} from posts where id = $1`, [id]);
  const rub = await pool.query("select config from rubrics where post_id = $1 and version = $2", [id, p.rows[0].current_rubric_version]);
  const rev = await pool.query("select u.id, u.name, u.email from post_reviewers pr join users u on u.id = pr.user_id where pr.post_id = $1 order by u.name", [id]);
  return { ...shape(p.rows[0]), rubric: rub.rows[0]?.config as Rubric, reviewers: rev.rows };
}

export async function createPost(user: AuthUser, input: z.infer<typeof createPostSchema>) {
  const { rubric, ...p } = input;
  return withTx(async (c) => {
    const r = await c.query(
      `insert into posts (title, organisation, summary, description, type, mode, location, deadline, start_date, info_session, seats,
         min_education, languages, missions, must_have, nice_to_have, auto_queue, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) returning id`,
      [p.title, p.organisation, p.summary, p.description, p.type, p.mode, p.location, p.deadline, p.startDate, p.infoSession || null, p.seats,
        p.minEducation, p.languages, JSON.stringify(p.missions), JSON.stringify(p.mustHave), JSON.stringify(p.niceToHave), p.autoQueue, user.id]);
    const id: string = r.rows[0].id;
    await c.query("insert into rubrics (post_id, version, config, created_by) values ($1, 1, $2, $3)", [id, JSON.stringify(rubric ?? defaultRubric()), user.id]);
    await audit(c, { actor: actorOf(user), action: "post.created", entityType: "post", entityId: id });
    return id;
  });
}

export async function updatePost(user: AuthUser, id: string, patch: z.infer<typeof updatePostSchema>) {
  const map: Record<string, string> = {
    title: "title", organisation: "organisation", summary: "summary", description: "description", type: "type", mode: "mode", location: "location",
    deadline: "deadline", startDate: "start_date", infoSession: "info_session", seats: "seats", minEducation: "min_education", languages: "languages",
    missions: "missions", mustHave: "must_have", niceToHave: "nice_to_have", autoQueue: "auto_queue",
  };
  const sets: string[] = [];
  const vals: unknown[] = [id];
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || !map[k]) continue; // column names come from the fixed map above, never from input
    vals.push(Array.isArray(v) ? JSON.stringify(v) : k === "infoSession" ? v || null : v);
    sets.push(`${map[k]} = $${vals.length}`);
  }
  if (!sets.length) return;
  const r = await pool.query(`update posts set ${sets.join(", ")}, updated_at = now() where id = $1`, vals);
  if (!r.rowCount) throw notFound("Offre");
  await audit(pool, { actor: actorOf(user), action: "post.updated", entityType: "post", entityId: id, details: { fields: Object.keys(patch) } });
}

export async function setPostStatus(user: AuthUser, id: string, status: "draft" | "open" | "closed") {
  if (status === "open") {
    const n = await pool.query("select count(*)::int as n from post_reviewers where post_id = $1", [id]);
    if (n.rows[0].n < 1) throw new HttpError(409, "no_reviewers", "Assignez au moins un réviseur avant de publier l'offre.");
  }
  const r = await pool.query("update posts set status = $2, updated_at = now() where id = $1", [id, status]);
  if (!r.rowCount) throw notFound("Offre");
  await audit(pool, { actor: actorOf(user), action: "post.status", entityType: "post", entityId: id, details: { status } });
}

export async function setReviewers(user: AuthUser, id: string, userIds: string[]) {
  return withTx(async (c) => {
    if (userIds.length) {
      const ok = await c.query("select id from users where id = any($1::uuid[]) and role = 'reviewer' and active", [userIds]);
      if (ok.rowCount !== new Set(userIds).size) throw new HttpError(422, "invalid_reviewers", "Un ou plusieurs réviseurs sont introuvables ou inactifs.");
    }
    const post = await c.query("select 1 from posts where id = $1 for update", [id]);
    if (!post.rowCount) throw notFound("Offre");
    await c.query("delete from post_reviewers where post_id = $1", [id]);
    for (const uid of new Set(userIds)) await c.query("insert into post_reviewers (post_id, user_id) values ($1, $2)", [id, uid]);
    await audit(c, { actor: actorOf(user), action: "post.reviewers", entityType: "post", entityId: id, details: { userIds } });
  });
}

/** For posts with auto_queue = false: release every Scored application to the reviewers (Scored --queued--> In review). */
export async function queueScored(user: AuthUser, id: string) {
  return withTx(async (c: PoolClient) => {
    const apps = await c.query("select id from applications where post_id = $1 and status = 'scored' order by created_at for update", [id]);
    for (const a of apps.rows) await transition(c, a.id, "scored", "queued", actorOf(user));
    return apps.rowCount ?? 0;
  });
}
