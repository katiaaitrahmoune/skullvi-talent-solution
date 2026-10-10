/** Public offer, as returned by GET /api/posts (candidates never see rubric or reviewers). */
export type PublicPost = {
  id: string; title: string; organisation: string; summary: string; description: string;
  type: string; mode: string; location: string; deadline: string; startDate: string; infoSession: string;
  seats: number; minEducation: string; languages: string; missions: string[]; mustHave: string[]; niceToHave: string[];
};
export type Post = PublicPost;

const fmt = (opts: Intl.DateTimeFormatOptions) => (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("fr-FR", { ...opts, timeZone: opts.hour ? undefined : "UTC" }).format(d);
};
export const formatDate = fmt({ day: "numeric", month: "long", year: "numeric" });
export const formatDateTime = fmt({ day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
