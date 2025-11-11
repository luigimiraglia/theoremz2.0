// app/(legal)/cookie-policy/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { getLegalInfo } from "@/lib/legal";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Cookie Policy | Theoremz",
  description:
    "Uso di cookie e tecnologie simili sulla piattaforma Theoremz in conformità al GDPR.",
  openGraph: {
    title: "Cookie Policy | Theoremz",
    description:
      "Informativa sui cookie utilizzati da Theoremz e sulle modalità di gestione del consenso.",
    url: "https://theoremz.com/cookie-policy",
    siteName: "Theoremz",
    type: "article",
  },
  alternates: { canonical: "https://theoremz.com/cookie-policy" },
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="mt-8 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h2>
      <div className="prose prose-slate dark:prose-invert mt-2 max-w-none text-[15px] leading-7">
        {children}
      </div>
      <hr className="my-6 border-slate-200 dark:border-slate-800" />
    </section>
  );
}

export default function CookiePolicyPage() {
  const lastUpdate = "10 novembre 2025";
  const legal = getLegalInfo();
  const renderLink = (href: string, label: ReactNode) =>
    href.startsWith("http")
      ? (
          <a
            href={href}
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {label}
          </a>
        )
      : (
          <Link href={href} className="underline">
            {label}
          </Link>
        );

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Theoremz",
    url: "https://theoremz.com",
    logo: "https://theoremz.com/favicon-32x32.png",
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Cookie Policy | Theoremz",
    dateModified: "2025-11-10",
    url: "https://theoremz.com/cookie-policy",
    inLanguage: "it-IT",
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 text-slate-900 dark:text-slate-100 transition-colors bg-white/95 dark:bg-slate-950/95 rounded-3xl shadow-sm">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([orgSchema, webPageSchema]),
        }}
      />

      <header className="mb-5 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="text-[#1155ff]">
          ← Torna alla home
        </Link>
        <div>
          Ultimo aggiornamento: <b>{lastUpdate}</b>
        </div>
      </header>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Cookie Policy di Theoremz
      </h1>
      <p className="mt-2 rounded-lg border border-[#dbe7ff] dark:border-slate-800 bg-[#eef4ff] dark:bg-slate-900/60 p-3 text-[15px] text-slate-800 dark:text-slate-100">
        Questa informativa descrive l’uso di cookie e tecnologie affini su
        theoremz.com e sulle app collegate, ai sensi del GDPR e del Codice
        Privacy.
      </p>

      <Section id="1" title="1. Cosa sono i cookie">
        <p>
          I cookie sono piccoli file testuali che i siti web inviano al browser
          dell’utente per memorizzare informazioni utili alla navigazione. Possono
          essere reinstallati automaticamente durante visite successive per
          riconoscere il dispositivo e migliorare l’esperienza d’uso.
        </p>
      </Section>

      <Section id="2" title="2. Tipologie di cookie utilizzati">
        <ul className="list-disc pl-5">
          <li>
            <b>Cookie tecnici essenziali</b>: necessari al funzionamento del sito,
            autenticazione, gestione sessione e sicurezza.
          </li>
          <li>
            <b>Cookie funzionali</b>: memorizzano preferenze (lingua, tema,
            login) per personalizzare l’esperienza.
          </li>
          <li>
            <b>Cookie analitici</b>: raccolgono dati aggregati sull’uso del sito
            per finalità statistiche e di performance (es. Firebase Analytics).
          </li>
          <li>
            <b>Cookie di profilazione/marketing</b>: usati per creare profili e
            mostrare contenuti o annunci mirati; richiedono il consenso esplicito.
          </li>
        </ul>
      </Section>

      <Section id="3" title="3. Cookie di prima parte">
        <p>
          Theoremz utilizza cookie proprietari per autenticazione, salvataggio
          delle preferenze, tracciamento dei progressi di studio e gestione delle
          sessioni. Questi cookie sono essenziali e non richiedono consenso.
        </p>
      </Section>

      <Section id="4" title="4. Cookie di terze parti">
        <p>Alcuni servizi integrati installano cookie gestiti da terzi:</p>
        <ul className="list-disc pl-5">
          <li>
            <b>Google / Firebase</b> – analytics, autenticazione, performance –{" "}
            <a
              href="https://policies.google.com/privacy"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          </li>
          <li>
            <b>Stripe Inc.</b> – pagamenti online –{" "}
            <a
              href="https://stripe.com/privacy"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          </li>
          <li>
            <b>Vercel Inc.</b> – hosting e analytics di performance –{" "}
            <a
              href="https://vercel.com/legal/privacy-policy"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          </li>
          <li>
            <b>Sanity AS</b> – gestione contenuti –{" "}
            <a
              href="https://www.sanity.io/privacy"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          </li>
          <li>
            <b>Supabase Inc.</b> – database/chat –{" "}
            <a
              href="https://supabase.com/privacy"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          </li>
          <li>
            <b>Meta Platforms Inc.</b> – integrazioni WhatsApp/Instagram (se
            abilitate) –{" "}
            <a
              href="https://www.facebook.com/policy.php"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          </li>
        </ul>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Questi soggetti operano come autonomi titolari del trattamento. Invitiamo
          a consultare le rispettive informative.
        </p>
      </Section>

      <Section id="5" title="5. Durata dei cookie">
        <ul className="list-disc pl-5">
          <li>
            <b>Cookie di sessione</b>: si cancellano alla chiusura del browser.
          </li>
          <li>
            <b>Cookie persistenti</b>: restano salvati fino a 12 mesi (o periodo
            inferiore indicato nel banner di consenso).
          </li>
        </ul>
      </Section>

      <Section id="6" title="6. Base giuridica">
        <p>
          L’utilizzo dei cookie tecnici si basa sull’esecuzione del contratto o
          sul legittimo interesse del Titolare. Cookie analitici e di marketing
          sono installati solo previo consenso espresso tramite il banner.
        </p>
      </Section>

      <Section id="7" title="7. Gestione del consenso">
        <p>
          Al primo accesso viene mostrato un banner che consente di accettare,
          rifiutare o configurare i cookie per categoria. Le preferenze possono
          essere modificate in ogni momento tramite il link “Gestisci cookie” nel
          footer (Consent Manager). Le scelte vengono memorizzate per 12 mesi, salvo
          cancellazione manuale dei cookie dal browser.
        </p>
      </Section>

      <Section id="8" title="8. Disabilitare i cookie dal browser">
        <p>
          L’utente può gestire o disattivare i cookie dalle impostazioni del proprio
          browser:
        </p>
        <ul className="list-disc pl-5">
          <li>
            <a
              href="https://support.google.com/chrome/answer/95647?hl=it"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Chrome
            </a>
          </li>
          <li>
            <a
              href="https://support.mozilla.org/it/kb/gestione-dei-cookie"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Mozilla Firefox
            </a>
          </li>
          <li>
            <a
              href="https://support.apple.com/it-it/guide/safari/sfri11471/mac"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Safari
            </a>
          </li>
          <li>
            <a
              href="https://support.microsoft.com/it-it/topic/come-eliminare-i-cookie-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Microsoft Edge
            </a>
          </li>
        </ul>
      </Section>

      <Section id="9" title="9. Trasferimenti extra UE">
        <p>
          Alcuni fornitori (Stripe, Google, Vercel, ecc.) possono trattare dati in
          Paesi extra UE. Theoremz garantisce adeguate tutele tramite Standard
          Contractual Clauses approvate dalla Commissione Europea.
        </p>
      </Section>

      <Section id="10" title="10. Diritti degli utenti">
        <p>
          Gli utenti possono esercitare i diritti previsti dal GDPR (accesso,
          rettifica, cancellazione, limitazione, opposizione, portabilità) scrivendo
          a{" "}
          <a href={`mailto:${legal.supportEmail}`} className="underline">
            {legal.supportEmail}
          </a>
          .
        </p>
      </Section>

      <Section id="11" title="11. Aggiornamenti della Cookie Policy">
        <p>
          Theoremz può modificare la presente informativa in qualsiasi momento. Le
          modifiche saranno pubblicate su questa pagina con relativa data di
          aggiornamento.
        </p>
      </Section>

    </main>
  );
}
