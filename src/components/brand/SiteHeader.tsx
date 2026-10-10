import { Logo } from "./Logo";

const LINKS = [
  { label: "Cours", href: "https://www.skullvi.org/" },
  { label: "Espace Tuteurs", href: "https://www.skullvi.org/" },
  { label: "Forum de jeux", href: "https://www.skullvi.org/" },
];

// Same bar as skullvi.org: dark, rounded, hairline border.
export function SiteHeader() {
  return (
    <header className="flex items-center justify-between rounded-2xl border border-night-line bg-night px-5 py-2.5 text-white sm:px-9">
      <Logo />
      <nav aria-label="SKULLVI" className="flex items-center gap-1 sm:gap-3">
        {LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className="hidden rounded-lg px-3 py-2 text-[15px] text-white/90 transition-colors hover:text-white md:block"
          >
            {l.label}
          </a>
        ))}
        <a
          href="https://www.skullvi.org/"
          className="rounded-full border-2 border-white/90 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-white hover:text-night"
        >
          skullvi.org
        </a>
      </nav>
    </header>
  );
}
