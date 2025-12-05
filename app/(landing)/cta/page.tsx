// app/(landing)/link-in-bio/page.tsx
import Image from "next/image";
import OpenInBrowserButton from "@/components/OpenInBrowserButton";
import BottomStopCTA from "@/components/BottomStopCTA";
import TrackedA from "@/components/TrackedA";

export const metadata = {
  title: "Link in bio — risorse, esercizi e aiuto",
  description:
    "Tutti i link utili di Theoremz: risoluzione esercizi in 2 ore, risorse gratuite (freebies) e assistenza diretta.",
  alternates: { canonical: "/cta" },
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
    title: "Guida per le verifiche",
    href: "https://wa.link/6d4vpu",
    emoji: "📝",
    isWhatsApp: true,
  },
  {
    title: "Libro: Concentrarsi in classe",
    href: "https://wa.link/5fu7to",
    emoji: "📚",
    isWhatsApp: true,
  },
];

export default function LinkInBioPage() {
  return (
    <main className="bg-gradient-to-br from-sky-50 to-indigo-50 text-slate-900">
      <section className="relative mx-auto max-w-md px-5 pb-10 pt-8">
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
            La piattaforma N1 di matematica e fisica. Risorse gratuite +
            percorsi guidati per il successo scolastico.
          </p>
        </div>

        {/* Primary CTA: apri il sito nel browser di sistema */}
        <div className="mt-5">
          <OpenInBrowserButton
            className=""
            href="https://theoremz.com/?utm_source=link-in-bio&utm_medium=social&utm_campaign=linkinbio"
          />
        </div>

        {/* Freebies */}
        <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="mb-2 text-center text-[16px] font-extrabold text-slate-900">
            🎁 Risorse da scaricare gratis
          </div>
          <ul className="grid gap-2">
            {freebies.map((f) => {
              const isWA =
                (f as any).isWhatsApp ||
                (typeof f.href === "string" && f.href.includes("wa.link"));
              const base =
                "flex items-center justify-between rounded-xl px-4 py-3 text-[14px] font-semibold ring-1 transition hover:shadow-md hover:ring-slate-300";
              const cls = `${base} bg-white text-slate-900 ring-slate-200`;

              return (
                <li key={f.href}>
                  <TrackedA
                    href={f.href}
                    event="linkinbio_freebie_click"
                    params={{
                      title: f.title,
                      platform: isWA ? "whatsapp" : "pdf",
                    }}
                    className={cls}
                    target={isWA ? "_blank" : undefined}
                    rel={isWA ? "noopener noreferrer" : undefined}
                    aria-label={`Ottieni — ${f.title}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-[18px]" aria-hidden>
                        {(f as any).emoji}
                      </span>
                      <span>{f.title}</span>
                    </span>
                    {/* Pulsante "Ottieni": colore unico + shimmer in movimento */}
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-white text-[12.5px] font-extrabold shadow-md transition select-none bg-[linear-gradient(90deg,#0284c7,#38bdf8,#0284c7)] bg-[length:200%_100%] animate-shimmer">
                      Ottieni
                    </span>
                  </TrackedA>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Elevator pitch */}
        <section className="mt-6 mb-4 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-center text-[16px] font-extrabold text-slate-900">
            ❓ Vuoi migliorare in matematica e fisica?
          </h2>
          <p className="mt-2 text-center text-[13.5px] font-semibold text-slate-700">
            Ti guidiamo passo passo: dalle nozioni al metodo, fino a come
            affrontare le verifiche senza ansia. Meno stress, più risultati.
          </p>
          <ul className="mt-3 grid gap-2 text-[13.5px] text-slate-700">
            <li className="flex items-start gap-2">
              <span aria-hidden className="text-sky-600">
                ✔
              </span>
              Spiegazioni chiare e applicabili subito
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden className="text-sky-600">
                ✔
              </span>
              Esercizi svolti e strategie per verifiche/interrogazioni
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden className="text-sky-600">
                ✔
              </span>
              Percorso personalizzato e supporto quando serve
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden className="text-sky-600">
                ✔
              </span>
              Un insegnante dedicato ti aiuta ogni giorno
            </li>
          </ul>
        </section>

        {/* CTA fisso che si ferma a fine pagina */}
        <BottomStopCTA />
        {/* Come aiutiamo gli studenti (collage testimonianze) */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-center text-[16px] font-extrabold text-slate-900">
            💡 Come aiutiamo gli studenti
          </h2>
          <p className="mt-1 text-center text-[13px] font-semibold text-slate-600">
            Miglioriamo voti, metodo e sicurezza. Alcune testimonianze reali ↓
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3">
            {/* 1 */}
            <a
              href="/images/testimonial1.webp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Apri testimonianza studente 1 a schermo intero"
              title="Apri testimonianza"
              className="block"
            >
              <div className="relative h-52 overflow-hidden rounded-xl ring-1 ring-slate-200 shadow-sm">
                <div className="absolute inset-2">
                  <Image
                    src="/images/testimonial1.webp"
                    alt="Testimonianza studente 1"
                    fill
                    sizes="(max-width: 480px) 100vw, 420px"
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
            </a>

            {/* 2 */}
            <a
              href="/images/testimonial2.webp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Apri testimonianza studente 2 a schermo intero"
              title="Apri testimonianza"
              className="block"
            >
              <div className="relative h-52 overflow-hidden rounded-xl ring-1 ring-slate-200 shadow-sm">
                <div className="absolute inset-2">
                  <Image
                    src="/images/testimonial2.webp"
                    alt="Testimonianza studente 2"
                    fill
                    sizes="(max-width: 480px) 100vw, 420px"
                    className="object-contain"
                  />
                </div>
              </div>
            </a>

            {/* 3 */}
            <a
              href="/images/testimonial3.webp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Apri testimonianza studente 3 a schermo intero"
              title="Apri testimonianza"
              className="block"
            >
              <div className="relative h-52 overflow-hidden rounded-xl ring-1 ring-slate-200 shadow-sm">
                <div className="absolute inset-2">
                  <Image
                    src="/images/testimonial3.webp"
                    alt="Testimonianza studente 3"
                    fill
                    sizes="(max-width: 480px) 100vw, 420px"
                    className="object-contain"
                  />
                </div>
              </div>
            </a>

            {/* + altre */}
            <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
              <div>
                <div className="text-[14px] font-extrabold text-slate-700">
                  + tante altre testimonianze
                </div>
                <div className="text-[12px] font-semibold text-slate-500">
                  Siamo valutati 4.8/5 ⭐️
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Sentinella per fermare il CTA al fondo pagina */}
        <div id="cta-page-end" className="h-4" />
      </section>
    </main>
  );
}
