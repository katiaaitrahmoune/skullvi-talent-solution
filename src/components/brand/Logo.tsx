import Link from "next/link";
import { cn } from "@/lib/cn";

// Real SKULLVI logo lives in /public (logo.png = color, logo-white.png = for dark footer).
// Replace the files, or set NEXT_PUBLIC_LOGO_SRC, to swap in the official SVG.
const LOGO_SRC = process.env.NEXT_PUBLIC_LOGO_SRC || "/logo.png";

export function Logo({ className, white }: { className?: string; white?: boolean }) {
  return (
    <Link href="/" aria-label="SKULLVI, accueil" className={cn("inline-flex shrink-0", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={white ? "/logo-white.png" : LOGO_SRC} alt="SKULLVI" className="h-11 w-auto sm:h-12" />
    </Link>
  );
}
