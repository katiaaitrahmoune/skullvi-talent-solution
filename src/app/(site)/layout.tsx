import type { ReactNode } from "react";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";

// Public candidate-facing pages: SKULLVI header and footer.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pt-4">
        <SiteHeader />
      </div>
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </>
  );
}
