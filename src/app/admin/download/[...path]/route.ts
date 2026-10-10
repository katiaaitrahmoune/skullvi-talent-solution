import { NextResponse, type NextRequest } from "next/server";
import { staffFetch } from "@/lib/staff-api";

// Authenticated download proxy (the browser has no token): only these backend files can be fetched.
const ALLOWED = [/^posts\/[0-9a-f-]{36}\/export\.csv$/i, /^applications\/[0-9a-f-]{36}\/files\/(cv|edu-\d{1,2}|cert-\d{1,2})$/i, /^imports\/template\.csv$/];

export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  if (!ALLOWED.some((re) => re.test(path))) return new NextResponse("Not found", { status: 404 });
  const res = await staffFetch(`/${path}`);
  if (!res.ok) return new NextResponse("Téléchargement impossible", { status: res.status });
  const headers = new Headers();
  for (const h of ["content-type", "content-disposition"]) { const v = res.headers.get(h); if (v) headers.set(h, v); }
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", "no-store");
  return new NextResponse(res.body, { status: 200, headers });
}
