import { API_BASE } from "./config";
import type { PublicPost } from "./posts";

// Server-side reads for the candidate pages. A free Render backend can take ~1 min to wake up, hence the long timeout.
async function get<T>(path: string): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  try {
    const res = await fetch(`${API_BASE}/api${path}`, { cache: "no-store", signal: AbortSignal.timeout(60_000) });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 0 };
  }
}
export const fetchOpenPosts = () => get<PublicPost[]>("/posts");
export const fetchPost = (id: string) => get<PublicPost>(`/posts/${encodeURIComponent(id)}`);
