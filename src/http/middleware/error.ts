import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { flattenIssues } from "../../domain/submission.ts";
import { HttpError } from "../errors.ts";

// Error shape: { code, message, issues? }. 409 duplicate / 422 invalid / 404 closed match what the frontend already handles.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) });
    return;
  }
  if (err instanceof ZodError) {
    res.status(422).json({ code: "invalid", message: "Données invalides.", issues: flattenIssues(err) });
    return;
  }
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === "LIMIT_FILE_SIZE";
    res.status(tooBig ? 413 : 422).json({ code: "upload_error", message: tooBig ? "Fichier trop volumineux (5 Mo maximum)." : "Fichiers invalides." });
    return;
  }
  if ((err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ code: "bad_json", message: "Corps de requête illisible." });
    return;
  }
  console.error(err);
  res.status(500).json({ code: "internal", message: "Erreur interne." });
};
