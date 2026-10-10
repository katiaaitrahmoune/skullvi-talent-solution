import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CandidateData } from "@/lib/admin-types";
import { Card } from "./ui";

const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : null);
const when = (s: string, ongoing: boolean, e: string) => `${s || "?"} → ${ongoing ? "en cours" : e || "?"}`;
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function Ext({ href, children }: { href: string; children: ReactNode }) {
  const u = safeUrl(href);
  if (!u) return <span className="text-muted">{children}</span>;
  return <a href={u} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700">{children}<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>;
}
function Block({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return <div><h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</h4><p className="whitespace-pre-line text-[15px]">{text}</p></div>;
}

export function CandidateProfile({ id, d, required, preferred, files }: { id: string; d: CandidateData; required: string[]; preferred: string[]; files: { field: string; name: string }[] }) {
  const req = new Set(required.map(fold));
  const pref = new Set(preferred.map(fold));
  const have = new Set(d.skills.map(fold));
  const missing = required.filter((s) => !have.has(fold(s)));
  const file = (field: string) => files.find((f) => f.field === field);
  const dl = (field: string, label: string) => file(field) ? <a className="text-brand-600 hover:underline" href={`/admin/download/applications/${id}/files/${field}`}>{label}</a> : <span className="text-muted">{label}</span>;
  return (
    <div className="space-y-5">
      <Card title="Coordonnées">
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">E-mail</dt><dd><a className="text-brand-600" href={`mailto:${d.email}`}>{d.email}</a></dd></div>
          <div><dt className="text-muted">Téléphone</dt><dd>{d.phone || "—"}</dd></div>
          <div><dt className="text-muted">Lieu</dt><dd>{d.city}, {d.country}</dd></div>
          <div><dt className="text-muted">CV</dt><dd>{d.cvName ? dl("cv", d.cvName) : "Non fourni"}</dd></div>
          <div><dt className="text-muted">Disponibilité</dt><dd>{d.availability || "—"} · {d.workMode || "—"}</dd></div>
          <div><dt className="text-muted">Langues</dt><dd>{d.languages || "—"}</dd></div>
        </dl>
      </Card>

      <Card title="Compétences">
        <div className="flex flex-wrap gap-2">
          {d.skills.map((s) => (
            <span key={s} className={cn("rounded-full px-3 py-1 text-sm", req.has(fold(s)) ? "bg-green-500/15 text-green-600" : pref.has(fold(s)) ? "bg-accent-400/25 text-brand-900" : "bg-page text-muted")}>{s}</span>
          ))}
          {!d.skills.length && <span className="text-sm text-muted">Aucune compétence indiquée.</span>}
        </div>
        {missing.length > 0 && <p className="mt-3 text-sm"><span className="font-medium text-brand-700">Requises non listées :</span> {missing.join(", ")}</p>}
        <p className="mt-2 text-xs text-muted"><span className="text-green-600">Vert</span> : requise · <span className="text-brand-900">Jaune</span> : appréciée · gris : autre</p>
      </Card>

      <Card title="Projet">
        <p className="mb-3 text-base font-semibold">{d.projectTitle || "Sans titre"} {d.projectLink && <span className="ml-2 text-sm font-normal"><Ext href={d.projectLink}>Voir le projet</Ext></span>}</p>
        <div className="space-y-4">
          <Block label="Ce dont il/elle est fier(ère)" text={d.projectProud} />
          <Block label="Difficulté rencontrée" text={d.projectChallenge} />
          <Block label="Solution apportée" text={d.projectSolution} />
        </div>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {d.github && <Ext href={d.github}>GitHub</Ext>}{d.portfolio && <Ext href={d.portfolio}>Portfolio</Ext>}{d.linkedin && <Ext href={d.linkedin}>LinkedIn</Ext>}
        </p>
      </Card>

      <Card title="Formation et expérience">
        <ul className="space-y-3 text-sm">
          {d.education.map((e, i) => (
            <li key={`e${i}`}><p className="font-medium">{e.degree} · {e.institution}</p><p className="text-muted">{when(e.startDate, e.ongoing, e.endDate)}{e.fileName && <> · {dl(`edu-${i}`, e.fileName)}</>}</p></li>
          ))}
          {d.experience.map((x, i) => (
            <li key={`x${i}`}><p className="font-medium">{x.role} · {x.company}</p><p className="text-muted">{when(x.startDate, x.ongoing, x.endDate)}</p>{x.description && <p className="mt-1">{x.description}</p>}</li>
          ))}
          {d.education.length + d.experience.length === 0 && <li className="text-muted">Non renseigné.</li>}
        </ul>
        {d.certificates.length > 0 && (
          <>
            <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted">Certificats</h4>
            <ul className="space-y-1.5 text-sm">
              {d.certificates.map((c, i) => <li key={i}>{c.name} · {c.issuer} {c.date && <span className="text-muted">({c.date})</span>} {c.url && <Ext href={c.url}>Vérifier</Ext>} {c.fileName && dl(`cert-${i}`, c.fileName)}</li>)}
            </ul>
          </>
        )}
      </Card>

      <Card title="Lettre de motivation">
        <p className="whitespace-pre-line text-[15px]">{d.coverLetter || "—"}</p>
        {d.expectations && <div className="mt-4"><Block label="Attentes" text={d.expectations} /></div>}
      </Card>
    </div>
  );
}
