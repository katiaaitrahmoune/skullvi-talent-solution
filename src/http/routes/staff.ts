import { Router } from "express";
import { z } from "zod";
import { pool, withTx } from "../../db/pool.ts";
import { addAdjustment, addNote, adjustmentSchema, decide, decisionSchema, fileOf, getApplicationDetail, noteSchema } from "../../services/applications.ts";
import { confirmRun, confirmSchema, latestRun, runTop3 } from "../../services/ai/top3.ts";
import { audit } from "../../services/audit.ts";
import { actorOf } from "../../services/context.ts";
import { resolveStored } from "../../services/files.ts";
import { csvTemplate, exportRanking, importCsv } from "../../services/imports.ts";
import { assertPostAccess, createPost, createPostSchema, getStaffPost, listStaffPosts, queueScored, setPostStatus, setReviewers, updatePost, updatePostSchema } from "../../services/posts.ts";
import { ranking, rankingQuerySchema } from "../../services/ranking.ts";
import { createRubricVersion, listRubricVersions, rubricSchema } from "../../services/rubrics.ts";
import { createUser, createUserSchema, listUsers, updateUser, updateUserSchema } from "../../services/users.ts";
import { HttpError, param } from "../errors.ts";
import { currentUser, requireAuth, requireRole } from "../middleware/auth.ts";
import { upload } from "../middleware/upload.ts";

export const staffRouter = Router();
staffRouter.use(requireAuth);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
staffRouter.param("id", (_req, _res, next, id) => (UUID.test(id) ? next() : next(new HttpError(404, "not_found", "Ressource introuvable."))));
const admin = requireRole("admin");

// ---------- Admin: Create post / Define rubric ----------
staffRouter.get("/posts", async (_req, res) => { res.json(await listStaffPosts(currentUser(res))); });
staffRouter.post("/posts", admin, async (req, res) => {
  const id = await createPost(currentUser(res), createPostSchema.parse(req.body));
  res.status(201).json({ id });
});
staffRouter.get("/posts/:id", async (req, res) => { res.json(await getStaffPost(currentUser(res), param(req.params.id))); });
staffRouter.patch("/posts/:id", admin, async (req, res) => { await updatePost(currentUser(res), param(req.params.id), updatePostSchema.parse(req.body)); res.status(204).end(); });
staffRouter.post("/posts/:id/status", admin, async (req, res) => {
  const { status } = z.object({ status: z.enum(["draft", "open", "closed"]) }).parse(req.body);
  await setPostStatus(currentUser(res), param(req.params.id), status);
  res.status(204).end();
});
staffRouter.put("/posts/:id/reviewers", admin, async (req, res) => {
  const { userIds } = z.object({ userIds: z.array(z.string().uuid()).max(50) }).parse(req.body);
  await setReviewers(currentUser(res), param(req.params.id), userIds);
  res.status(204).end();
});
staffRouter.get("/posts/:id/rubric", async (req, res) => {
  await assertPostAccess(currentUser(res), param(req.params.id));
  const c = await pool.connect();
  try { res.json(await listRubricVersions(c, param(req.params.id))); } finally { c.release(); }
});
// A new version is created and every application still "Scored" is re-scored with it.
staffRouter.post("/posts/:id/rubric", admin, async (req, res) => {
  const rubric = rubricSchema.parse(req.body);
  res.status(201).json(await withTx((c) => createRubricVersion(c, param(req.params.id), rubric, actorOf(currentUser(res)))));
});
staffRouter.post("/posts/:id/queue", admin, async (req, res) => { res.json({ queued: await queueScored(currentUser(res), param(req.params.id)) }); });

// ---------- Admin: Import CSV ----------
staffRouter.get("/imports/template.csv", admin, (_req, res) => {
  res.type("text/csv").attachment("modele-import-candidatures.csv").send(csvTemplate());
});
staffRouter.post("/imports", admin, upload.single("file"), async (req, res) => {
  const { postId, consentConfirmed } = z.object({ postId: z.string().uuid(), consentConfirmed: z.literal("true", { errorMap: () => ({ message: "Vous devez confirmer que les candidats ont donné leur accord." }) }) }).parse(req.body);
  void consentConfirmed;
  if (!req.file) throw new HttpError(422, "bad_csv", "Fichier CSV manquant (champ « file »).");
  res.status(201).json(await importCsv(currentUser(res), postId, req.file.originalname, req.file.buffer));
});

// ---------- Reviewer: View ranked list / Export CSV ----------
staffRouter.get("/posts/:id/ranking", async (req, res) => {
  await assertPostAccess(currentUser(res), param(req.params.id));
  res.json(await ranking(param(req.params.id), rankingQuerySchema.parse(req.query)));
});
staffRouter.get("/posts/:id/export.csv", async (req, res) => {
  const user = currentUser(res);
  await assertPostAccess(user, param(req.params.id));
  await audit(pool, { actor: actorOf(user), action: "export.csv", entityType: "post", entityId: param(req.params.id) }); // personal data leaves the system
  res.type("text/csv").attachment(`classement-${param(req.params.id).slice(0, 8)}.csv`).send(await exportRanking(param(req.params.id)));
});

// ---------- Reviewer: Add note / adjust / decide ----------
staffRouter.get("/applications/:id", async (req, res) => { res.json(await getApplicationDetail(currentUser(res), param(req.params.id))); });
staffRouter.post("/applications/:id/notes", async (req, res) => { res.status(201).json(await addNote(currentUser(res), param(req.params.id), noteSchema.parse(req.body).body)); });
staffRouter.post("/applications/:id/adjustments", async (req, res) => { await addAdjustment(currentUser(res), param(req.params.id), adjustmentSchema.parse(req.body)); res.status(201).end(); });
staffRouter.post("/applications/:id/decision", async (req, res) => { res.json({ status: await decide(currentUser(res), param(req.params.id), decisionSchema.parse(req.body)) }); });
staffRouter.get("/applications/:id/files/:field", async (req, res) => {
  const f = await fileOf(currentUser(res), param(req.params.id), param(req.params.field));
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.download(resolveStored(f.path), f.name);
});

// ---------- AI top 3 ----------
staffRouter.post("/posts/:id/ai/top3", async (req, res) => { res.status(201).json(await runTop3(currentUser(res), param(req.params.id))); });
staffRouter.get("/posts/:id/ai/top3", async (req, res) => { res.json(await latestRun(currentUser(res), param(req.params.id))); });
staffRouter.post("/ai-runs/:id/confirm", async (req, res) => { res.json(await confirmRun(currentUser(res), param(req.params.id), confirmSchema.parse(req.body).order)); });

// ---------- Admin: users (reviewers) ----------
staffRouter.get("/users", admin, async (_req, res) => { res.json(await listUsers()); });
staffRouter.post("/users", admin, async (req, res) => { res.status(201).json(await createUser(currentUser(res), createUserSchema.parse(req.body))); });
staffRouter.patch("/users/:id", admin, async (req, res) => { res.json(await updateUser(currentUser(res), param(req.params.id), updateUserSchema.parse(req.body))); });
