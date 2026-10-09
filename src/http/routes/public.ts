import { Router } from "express";
import { pool } from "../../db/pool.ts";
import { SYSTEM } from "../../services/context.ts";
import { audit } from "../../services/audit.ts";
import { removeFiles, saveFiles } from "../../services/files.ts";
import { intake, newReference, persistAndScore } from "../../services/pipeline.ts";
import { getOpenPost, listOpenPosts } from "../../services/posts.ts";
import { HttpError, param } from "../errors.ts";
import { applyLimiter } from "../middleware/limits.ts";
import { assertValidFiles, upload } from "../middleware/upload.ts";

export const publicRouter = Router();

publicRouter.get("/posts", async (_req, res) => { res.json(await listOpenPosts()); });
publicRouter.get("/posts/:id", async (req, res) => { res.json(await getOpenPost(param(req.params.id))); });

/**
 * Candidate: Submit form. multipart/form-data with `data` (JSON) + optional files `cv`, `edu-<i>`, `cert-<i>`.
 *   201 { reference }  - 422 { issues } (fix errors) - 409 duplicate - 404 closed
 * The response never reveals score, tier or status.
 */
publicRouter.post("/applications", applyLimiter, upload.any(), async (req, res) => {
  let raw: unknown;
  try { raw = JSON.parse(String(req.body?.data)); } catch { throw new HttpError(400, "bad_request", "Champ « data » (JSON) manquant ou invalide."); }

  const result = intake(raw);
  if (!result.ok) {
    // "Submitted --invalid--> Invalid": nothing is stored for the candidate, the attempt is logged without personal data.
    await audit(pool, { actor: SYSTEM, action: "submission.invalid", entityType: "post", entityId: String((raw as { postId?: unknown })?.postId ?? "unknown").slice(0, 64), details: { source: "form", fields: Object.keys(result.errors) } });
    res.status(422).json({ code: "invalid", issues: result.errors });
    return;
  }
  if (!result.postId) { res.status(422).json({ code: "invalid", issues: { postId: "Offre requise" } }); return; }

  const files = req.files as Express.Multer.File[] | undefined;
  assertValidFiles(files);

  const reference = newReference();
  const stored = await saveFiles(reference, files ?? []);
  // File names come from what was really uploaded, not from what the client claims.
  const nameOf = (field: string) => stored.find((f) => f.field === field)?.name ?? "";
  const data = {
    ...result.data,
    cvName: nameOf("cv"),
    education: result.data.education.map((e, i) => ({ ...e, fileName: nameOf(`edu-${i}`) })),
    certificates: result.data.certificates.map((c, i) => ({ ...c, fileName: nameOf(`cert-${i}`) })),
  };
  try {
    const created = await persistAndScore({ postId: result.postId, data, source: "form", reference, files: stored, actor: SYSTEM });
    res.status(201).json({ reference: created.reference });
  } catch (e) {
    await removeFiles(reference);
    throw e;
  }
});
