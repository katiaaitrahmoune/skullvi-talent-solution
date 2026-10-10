import { NextResponse } from "next/server";
import { SKILL_BANK } from "@/lib/options";

export const runtime = "nodejs";

// Reads a PDF/TXT CV and returns the fields it can find with simple rules.
// Swap the body for a call to your AI/parsing service later; keep the response shape.
export async function POST(req: Request) {
  const fd = await req.formData();
  const file = fd.get("cv");
  if (!(file instanceof File)) return NextResponse.json({ code: "no_file" }, { status: 422 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ code: "too_large" }, { status: 413 });

  let text = "";
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    if (/\.pdf$/i.test(file.name)) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      try {
        text = (await parser.getText()).text;
      } finally {
        await parser.destroy();
      }
    } else if (/\.(txt|md)$/i.test(file.name)) {
      text = buf.toString("utf8");
    } else {
      return NextResponse.json({ code: "unsupported" }, { status: 415 });
    }
  } catch {
    return NextResponse.json({ code: "unreadable" }, { status: 422 });
  }
  if (text.trim().length < 20) return NextResponse.json({ code: "empty" }, { status: 422 });

  const fields: Record<string, string | string[]> = {};
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
  if (email) fields.email = email;
  const phone = text.match(/\+?\d[\d ().-]{7,16}\d/)?.[0];
  if (phone) fields.phone = phone.trim();
  const linkedin = text.match(/https?:\/\/(?:[\w]+\.)?linkedin\.com\/[^\s)]+/i)?.[0];
  if (linkedin) fields.linkedin = linkedin;
  const github = text.match(/https?:\/\/(?:www\.)?github\.com\/[\w-]+/i)?.[0];
  if (github) fields.github = github;

  const nameLine = text.split(/\r?\n/).slice(0, 8).map((l) => l.trim())
    .find((l) => /^[A-Za-zÀ-ÿ'’ -]{3,40}$/.test(l) && l.split(/\s+/).length >= 2 && l.split(/\s+/).length <= 4);
  if (nameLine) {
    const parts = nameLine.split(/\s+/).map((w) => (w === w.toUpperCase() ? w[0] + w.slice(1).toLowerCase() : w));
    fields.firstName = parts[0];
    fields.lastName = parts.slice(1).join(" ");
  }

  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const skills = SKILL_BANK.filter((s) => new RegExp(`(^|[^\\w])${esc(s)}($|[^\\w])`, "i").test(text));
  if (skills.length) fields.skills = Array.from(new Set(skills)).slice(0, 15);

  return NextResponse.json({ fields });
}
