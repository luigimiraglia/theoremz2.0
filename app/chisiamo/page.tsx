// app/chi-siamo/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

// ====== SEO ======
const TITLE = "Chi siamo — Persone, non solo formule";
const DESC =
  "Siamo un piccolo team di insegnanti e studenti. Qui trovi come lavoriamo, perché lo facciamo e come contattarci. Niente ansia: solo chiarezza, ascolto e cura.";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/chisiamo`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/chisiamo" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: CANONICAL,
    siteName: "Theoremz",
    images: [{ url: "/opengraph-image" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    site: "@theoremz_",
    images: ["/opengraph-image"],
  },
};

const CONTACT = {
  email: "theoremz.team@gmail.com",
  ig: "https://www.instagram.com/theoremz__",
  tiktok: "https://www.tiktok.com/@theoremz_",
  whatsapp: "https://wa.me/393519523641",
};

export default function ChiSiamoPage() {
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Theoremz",
    url: SITE,
    logo: `${SITE}/images/logo.webp`,
    sameAs: [CONTACT.ig, CONTACT.tiktok],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: CONTACT.email,
        availableLanguage: ["it"],
      },
    ],
  };

  return (
    <main className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />

      {/* HERO (sobrio) */}
      <section className="border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="mx-auto max-w-6xl px-5 pt-10 pb-8 sm:px-8 lg:px-12">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] sm:text-[12px] font-semibold text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
                👋 Chi siamo
              </span>
              <h1 className="mt-3 text-[32px] sm:text-[40px] lg:text-[48px] font-black leading-tight">
                Persone, non solo formule
              </h1>
              <p className="mt-4 max-w-2xl text-[16.5px] leading-relaxed text-slate-600 dark:text-slate-300/90">
                Siamo un piccolo team di insegnanti e studenti. Creiamo
                spiegazioni chiare, esercizi utili e forniamo una chat dove si
                può chiedere senza vergogna. La scuola è importante; il tuo
                benessere anche.
              </p>
            </div>

            {/* Box con tono calmo */}
            <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 p-5 ring-1 ring-slate-200 dark:ring-slate-800">
              <h2 className="text-[20px] font-extrabold">Cosa ci guida</h2>
              <ul className="mt-3 space-y-2 text-[14.5px] text-slate-600 dark:text-slate-300/90">
                <li>• Chiarezza prima di tutto.</li>
                <li>• Ascolto e rispetto per i tempi di ciascuno.</li>
                <li>• Materiali che ti fanno risparmiare fatica mentale.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* NUMERI (discreti) */}
      <section className="border-b border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-950/30">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["35K+", "Studenti aiutati"],
              ["2h", "Consegna media esercizi"],
              ["100%", "Rimborso se non soddisfatti"],
              ["7/7", "Domande in chat"],
            ].map(([big, small]) => (
              <div
                key={big}
                className="rounded-xl bg-white dark:bg-slate-900 px-4 py-4 text-center ring-1 ring-slate-200 dark:ring-slate-800"
              >
                <div className="text-[20px] sm:text-[22px] font-extrabold">
                  {big}
                </div>
                <div className="text-[12.5px] sm:text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                  {small}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VALORI & METODO */}
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-12">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 ring-1 ring-slate-200 dark:ring-slate-800">
            <h3 className="text-[20px] font-extrabold">I nostri valori</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                [
                  "🧭 Chiarezza",
                  "Dire le cose come stanno, con parole semplici.",
                ],
                [
                  "🤝 Rispetto",
                  "Ogni domanda è legittima. Qui si può sbagliare.",
                ],
                [
                  "🧩 Concretezza",
                  "Esempi reali, passaggi numerati, metodi riutilizzabili.",
                ],
                ["🌱 Cura", "Ridurre l’ansia, aumentare la fiducia."],
              ].map(([h, p]) => (
                <div
                  key={h}
                  className="rounded-xl bg-slate-50 dark:bg-slate-950/40 p-4 ring-1 ring-slate-200/70 dark:ring-slate-800"
                >
                  <div className="font-bold">{h}</div>
                  <p className="mt-1 text-[14.5px] text-slate-600 dark:text-slate-300/90">
                    {p}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 ring-1 ring-slate-200 dark:ring-slate-800">
            <h3 className="text-[20px] font-extrabold">Come lavoriamo</h3>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-[15px] text-slate-600 dark:text-slate-300/90">
              <li>Spiegazioni essenziali, accurate e rileggibili.</li>
              <li>Esercizi risolti passo passo con errori tipici.</li>
              <li>Chat amichevole: niente giudizi, solo aiuto.</li>
              <li>Feedback continui: il sito migliora con voi.</li>
            </ol>
            <p className="mt-3 text-[13px] text-slate-500 dark:text-slate-400">
              Siamo sempre felici di ascoltare suggerimenti.
            </p>
          </div>
        </div>
      </section>

      {/* LINK SOCIAL sobri */}
      <section className="mx-auto max-w-6xl px-5 pb-10 sm:px-8 lg:px-12">
        <h3 className="text-[20px] font-extrabold">Dove trovarci</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <a
            href={CONTACT.ig}
            target="_blank"
            className="rounded-2xl bg-white dark:bg-slate-900 p-5 ring-1 ring-slate-200 dark:ring-slate-800 hover:shadow-sm transition"
          >
            <div className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">
              Instagram
            </div>
            <div className="mt-1 text-[18px] font-extrabold">@theoremz__</div>
            <p className="mt-2 text-[13.5px] text-slate-600 dark:text-slate-400">
              Reel, tips, mini-spiegazioni.
            </p>
          </a>
          <a
            href={CONTACT.tiktok}
            target="_blank"
            className="rounded-2xl bg-white dark:bg-slate-900 p-5 ring-1 ring-slate-200 dark:ring-slate-800 hover:shadow-sm transition"
          >
            <div className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">
              TikTok
            </div>
            <div className="mt-1 text-[18px] font-extrabold">@theoremz_</div>
            <p className="mt-2 text-[13.5px] text-slate-600 dark:text-slate-400">
              Trucchi veloci e tecniche d’esame.
            </p>
          </a>
          <a
            href={CONTACT.whatsapp}
            target="_blank"
            className="rounded-2xl bg-white dark:bg-slate-900 p-5 ring-1 ring-slate-200 dark:ring-slate-800 hover:shadow-sm transition"
          >
            <div className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">
              WhatsApp
            </div>
            <div className="mt-1 text-[18px] font-extrabold">
              Chatta con noi
            </div>
            <p className="mt-2 text-[13.5px] text-slate-600 dark:text-slate-400">
              Risposte rapide, niente bot.
            </p>
          </a>
        </div>
      </section>

      {/* CONTATTI (form) */}
      <section
        id="contatti"
        className="border-t border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-950/30"
      >
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-12">
          <div className="grid gap-6 md:grid-cols-5">
            <div className="md:col-span-2">
              <h3 className="text-[20px] font-extrabold">Scrivici</h3>
              <p className="mt-2 text-[15px] text-slate-600 dark:text-slate-300/90">
                Collaborazioni, domande, idee: leggiamo tutto con attenzione.
              </p>
              <div className="mt-4 space-y-2 text-[14.5px]">
                <div>
                  📧 Email:{" "}
                  <a
                    href={`mailto:${CONTACT.email}`}
                    className="font-semibold text-blue-700 dark:text-sky-400 underline underline-offset-2"
                  >
                    {CONTACT.email}
                  </a>
                </div>
                <div>
                  💬 WhatsApp:{" "}
                  <a
                    href={CONTACT.whatsapp}
                    target="_blank"
                    className="font-semibold text-emerald-700 dark:text-emerald-400 underline underline-offset-2"
                  >
                    apri chat
                  </a>
                </div>
                <div>
                  🔗 Sito:{" "}
                  <Link
                    href="/"
                    className="font-semibold underline underline-offset-2"
                  >
                    theoremz.com
                  </Link>
                </div>
              </div>
            </div>

            <div className="md:col-span-3 rounded-2xl bg-white dark:bg-slate-900 p-5 ring-1 ring-slate-200 dark:ring-slate-800">
              <ContactFormSSRShim />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* Import “morbido” del form (niente JS fuori dal necessario) */
async function ContactFormSSRShim() {
  const ContactForm = (await import("@/components/ContactForm")).default;
  return <ContactForm />;
}
