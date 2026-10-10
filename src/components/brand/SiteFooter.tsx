import { Mail, MapPin } from "lucide-react";
import { Logo } from "./Logo";

const SITE = "https://www.skullvi.org/";
const card = "rounded-2xl border border-night-line p-7";

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-night text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 lg:grid-cols-3">
        <section className={card}>
          <p className="text-2xl font-medium">
            <span className="text-blue-500">Partage.</span>{" "}
            <span className="text-green-500">Apprends.</span>{" "}
            <span className="text-brand-500">Gagne.</span>
          </p>
          <ul className="mt-8 space-y-4 text-[15px]">
            {["Cours", "Espace Tuteurs", "Forum de jeux", "A propos"].map((l) => (
              <li key={l}>
                <a href={SITE} className="transition-colors hover:text-accent-400">{l}</a>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${card} flex flex-col items-center text-center`}>
          <p className="text-xl font-medium">Nous serions ravis de vous accueillir au sein de notre communauté</p>
          <Logo white className="mt-8" />
          <p className="mt-auto pt-8 text-night-muted">{new Date().getFullYear()}©SKULLVI Tous droits réservés</p>
          <a href={SITE} className="mt-2 text-sm transition-colors hover:text-accent-400">Politique de confidentialité</a>
        </section>

        <section className={card}>
          <h2 className="text-2xl font-medium">Contacts</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {[
              { country: "Belgique", phone: "0032 470 34 19 10", address: ["Rue des Six Jetons 4", "7850, Enghien"] },
              { country: "Togo", phone: "00228 96 71 53 34", address: ["CNSS Baguida SE-2n°41", "07 BP 13 793, Lomé"] },
            ].map((c) => (
              <div key={c.country}>
                <h3 className="flex items-center gap-2 text-lg"><MapPin className="h-4 w-4" aria-hidden />{c.country}</h3>
                <p className="mt-3">{c.phone}</p>
                <p className="mt-3 text-sm leading-6">{c.address[0]}<br />{c.address[1]}</p>
              </div>
            ))}
          </div>
          <a href="mailto:info@skullvi.org" className="mt-6 inline-flex items-center gap-2 transition-colors hover:text-accent-400">
            <Mail className="h-4 w-4" aria-hidden />info@skullvi.org
          </a>
        </section>
      </div>
    </footer>
  );
}
