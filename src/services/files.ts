import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.ts";

export type StoredFile = { field: string; name: string; size: number; mime: string; path: string };
type Upload = { fieldname: string; originalname: string; buffer: Buffer; size: number };

const root = () => path.resolve(env.UPLOAD_DIR);

/** Identify a file by its first bytes: the client-declared type is never trusted. */
export function sniffMime(b: Buffer): string | null {
  if (b.subarray(0, 4).toString("latin1") === "%PDF") return "application/pdf";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x50 && b[1] === 0x4b) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (b.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))) return "application/msword";
  return null;
}

export const FIELD_RE = /^(cv|edu-\d{1,2}|cert-\d{1,2})$/;
const safeName = (n: string) => path.basename(n).replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "file";

export async function saveFiles(reference: string, uploads: Upload[]): Promise<StoredFile[]> {
  const out: StoredFile[] = [];
  if (!uploads.length) return out;
  await fs.mkdir(path.join(root(), reference), { recursive: true });
  for (const u of uploads) {
    const rel = `${reference}/${u.fieldname}__${safeName(u.originalname)}`;
    await fs.writeFile(path.join(root(), rel), u.buffer, { flag: "wx" });
    out.push({ field: u.fieldname, name: u.originalname.slice(0, 200), size: u.size, mime: sniffMime(u.buffer) ?? "application/octet-stream", path: rel });
  }
  return out;
}

export const removeFiles = (reference: string) => fs.rm(path.join(root(), reference), { recursive: true, force: true });

/** Resolve a stored relative path, refusing anything that escapes the upload directory. */
export function resolveStored(rel: string): string {
  const full = path.resolve(root(), rel);
  if (!full.startsWith(root() + path.sep)) throw new Error("path escape");
  return full;
}
