export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
export const notFound = (what = "Ressource") => new HttpError(404, "not_found", `${what} introuvable.`);
export const forbidden = (msg = "Accès refusé.") => new HttpError(403, "forbidden", msg);

/** Express types route params as string | string[] depending on the version: normalise to one string. */
export const param = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";
