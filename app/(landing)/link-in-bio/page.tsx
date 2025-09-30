// app/(landing)/link-in-bio/page.tsx
import Image from "next/image";
import Link from "next/link";
import OpenInBrowserButton from "@/components/OpenInBrowserButton";
import TrackedLink from "@/components/TrackedLink";
import TrackedA from "@/components/TrackedA";

export const metadata = {
  title: "Link in bio — risorse, esercizi e aiuto",
  description:
    "Tutti i link utili di Theoremz: risoluzione esercizi in 2 ore, risorse gratuite (freebies) e possibilità di richiedere una chiamata.",
  alternates: { canonical: "/link-in-bio" },
  openGraph: {
    type: "website",
    title: "Theoremz — Link in bio",
    description:
      "Risoluzione esercizi, risorse gratuite e assistenza. Tutto in un'unica pagina.",
    images: [{ url: "/metadata.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Theoremz — Link in bio",
    description:
      "Risoluzione esercizi, risorse gratuite e assistenza. Tutto in un'unica pagina.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
};

const freebies = [
  {
    title: "Teoremi di Analisi (PDF)",
    href: "/pdf/teoremi-di-analisi.pdf?utm_source=link-in-bio&utm_medium=social&utm_campaign=freebie",
    emoji: "📘",
  },
  { title: "Numeri Complessi (PDF)", href: "/pdf/numeri-complessi.pdf?utm_source=link-in-bio&utm_medium=social&utm_campaign=freebie", emoji: "📗" },
  { title: "Derivate (PDF)", href: "/pdf/derivate.pdf?utm_source=link-in-bio&utm_medium=social&utm_campaign=freebie", emoji: "📙" },
  {
    title: "Limiti notevoli (PDF)",
    href: "/pdf/limiti-notevoli.pdf?utm_source=link-in-bio&utm_medium=social&utm_campaign=freebie",
    emoji: "📕",
  },
];

export default function LinkInBioPage() {
  return (
    <main className="bg-white text-slate-900">
      <section className="mx-auto max-w-md px-5 pb-10 pt-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3 h-16 w-16 overflow-hidden rounded-full ring-2 ring-slate-200">
            <Image
              src="/images/logo.png"
              alt="Theoremz"
              width={128}
              height={128}
              priority
              sizes="64px"
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />
          </div>
          <h1 className="text-[22px] font-black">Theoremz</h1>
          <p className="mt-1 max-w-sm text-[13.5px] font-semibold text-slate-600">
            Aiuto in matematica e fisica. Risoluzione esercizi, risorse
            gratuite e assistenza.
          </p>
        </div>

        {/* Primary CTAs */}
        <div className="mt-5 space-y-3">
          {/* Main: open site in system browser */}
          <OpenInBrowserButton
            className=""
            href="https://theoremz.com/?utm_source=link-in-bio&utm_medium=social&utm_campaign=linkinbio"
          />

          {/* Call request (max 4 words) */}
          <TrackedLink
            href="/contatto-rapido?source=link-in-bio"
            className="block w-full rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-center text-[15px] font-extrabold text-emerald-700"
            event="linkinbio_call_click"
            ariaLabel="Richiedi una chiamata gratuita"
          >
            ☎️ Ti chiamiamo per orientarti
          </TrackedLink>
        </div>

        {/* Freebies */}
        <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="mb-2 text-center text-[16px] font-extrabold text-slate-900">
            🎁 Freebies da scaricare
          </div>
          <ul className="grid gap-2">
            {freebies.map((f) => (
              <li key={f.href}>
                <TrackedA
                  href={f.href}
                  event="linkinbio_freebie_click"
                  params={{ title: f.title }}
                  className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-[14px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[18px]" aria-hidden>
                      {f.emoji}
                    </span>
                    {f.title}
                  </span>
                  <span className="text-sky-600">Scarica</span>
                </TrackedA>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer mini */}
        <p className="mt-6 text-center text-[12.5px] font-semibold text-slate-500">
          © {new Date().getFullYear()} Theoremz — Tutti i diritti riservati
        </p>
      </section>
    </main>
  );
}
