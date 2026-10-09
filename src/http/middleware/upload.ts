import multer from "multer";
import { HttpError } from "../errors.ts";
import { FIELD_RE, sniffMime } from "../../services/files.ts";

// Files stay in memory until we have checked their real type; 5 MB each, 15 files at most.
export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 15, fields: 10, fieldSize: 1024 * 1024 } });

export function assertValidFiles(files: Express.Multer.File[] | undefined) {
  for (const f of files ?? []) {
    if (!FIELD_RE.test(f.fieldname)) throw new HttpError(422, "invalid_file", `Champ de fichier inattendu : ${f.fieldname}`);
    if (!sniffMime(f.buffer)) throw new HttpError(422, "invalid_file", `Type de fichier non accepté : ${f.originalname} (PDF, Word, PNG ou JPEG).`);
  }
}
