import { API_BASE } from "./config";
import type { ApplicationValues } from "./schema";

export class ApiError extends Error {
  code: "duplicate" | "invalid" | "closed" | "rate" | "server" | "network";
  constructor(code: ApiError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

/** Candidate submission: multipart with the JSON fields in `data` plus the real files (cv, edu-<i>, cert-<i>). */
export async function submitApplication(values: ApplicationValues, postId: string): Promise<{ reference: string }> {
  const fd = new FormData();
  const data = {
    ...values,
    postId,
    cvFile: undefined,
    cvFileName: values.cvFile?.name ?? "",
    education: values.education.map((e) => ({ ...e, file: undefined, fileName: e.file?.name ?? "" })),
    certificates: values.certificates.map((c) => ({ ...c, file: undefined, fileName: c.file?.name ?? "" })),
  };
  fd.append("data", JSON.stringify(data));
  if (values.cvFile) fd.append("cv", values.cvFile);
  values.education.forEach((e, i) => e.file && fd.append(`edu-${i}`, e.file));
  values.certificates.forEach((c, i) => c.file && fd.append(`cert-${i}`, c.file));

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/applications`, { method: "POST", body: fd });
  } catch {
    throw new ApiError("network", "Connexion impossible. Vérifiez votre réseau et réessayez (le serveur peut mettre une minute à démarrer).");
  }
  if (res.status === 409) throw new ApiError("duplicate", "Une candidature existe déjà avec cet e-mail pour cette offre.");
  if (res.status === 404) throw new ApiError("closed", "Cette offre n'accepte plus de candidatures.");
  if (res.status === 422) throw new ApiError("invalid", "Certaines informations sont invalides. Relisez le formulaire.");
  if (res.status === 413) throw new ApiError("invalid", "Un fichier dépasse 5 Mo.");
  if (res.status === 429) throw new ApiError("rate", "Trop de tentatives. Réessayez dans quelques minutes.");
  if (!res.ok) throw new ApiError("server", "Le serveur a rencontré un problème. Réessayez dans un instant.");
  return res.json();
}
