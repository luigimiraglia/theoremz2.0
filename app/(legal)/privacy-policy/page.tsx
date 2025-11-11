// app/(legal)/privacy-policy/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { getLegalInfo } from "@/lib/legal";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Privacy Policy | Theoremz",
  description:
    "Informativa sul trattamento dei dati personali di Theoremz conforme al GDPR.",
  openGraph: {
    title: "Privacy Policy | Theoremz",
    description:
      "Informativa sul trattamento dei dati personali di Theoremz conforme al GDPR.",
    url: "https://theoremz.com/privacy-policy",
    siteName: "Theoremz",
    type: "article",
  },
  alternates: { canonical: "https://theoremz.com/privacy-policy" },
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

export default function PrivacyPolicyPage() {
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
    name: "Privacy Policy | Theoremz",
    dateModified: "2025-11-10",
    url: "https://theoremz.com/privacy-policy",
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
        Privacy Policy di Theoremz
      </h1>
      <p className="mt-2 rounded-lg border border-[#dbe7ff] dark:border-slate-800 bg-[#eef4ff] dark:bg-slate-900/60 p-3 text-[15px] text-slate-800 dark:text-slate-100">
        Informativa ai sensi del Regolamento (UE) 2016/679 (“GDPR”) e del D.Lgs.
        196/2003 sul trattamento dei dati personali degli utenti che accedono o
        utilizzano i servizi disponibili su theoremz.com e relative app.
      </p>

      <nav
        aria-label="Indice"
        className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfcff] dark:bg-slate-900/40 p-4 text-[15px]"
      >
        <strong>Indice</strong>
        <ol className="mt-2 list-decimal pl-5 space-y-1">
          {[
            "Titolare del trattamento",
            "Categorie di dati trattati",
            "Finalità e basi giuridiche",
            "Fornitori / Responsabili esterni",
            "Trasferimenti extra UE",
            "Conservazione",
            "Diritti dell’utente GDPR",
            "Come esercitare i diritti",
            "Sicurezza",
            "Cookie",
            "Marketing",
            "Minori",
            "Modifiche",
            "Contatti",
          ].map((label, idx) => (
            <li key={label}>
              <a className="text-[#1155ff] underline" href={`#${idx + 1}`}>
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Section id="1" title="1. Titolare del trattamento">
        <p>
          Titolare: <b>{legal.companyName}</b> – P. IVA <b>{legal.vatNumber}</b>{" "}
          – sede legale <b>{legal.registeredAddress}</b> – email di contatto{" "}
          <a href={`mailto:${legal.supportEmail}`} className="underline">
            {legal.supportEmail}
          </a>
          .
        </p>
      </Section>

      <Section id="2" title="2. Categorie di dati trattati">
        <ul className="list-disc pl-5">
          <li>
            <b>Dati identificativi</b>: nome, cognome, indirizzo email, eventuale
            data di nascita, credenziali.
          </li>
          <li>
            <b>Dati di pagamento</b>: gestiti tramite Stripe; Theoremz non
            conserva numeri di carte.
          </li>
          <li>
            <b>Dati tecnici</b>: indirizzi IP, identificativi di dispositivo,
            browser, log, cookie, token di sessione.
          </li>
          <li>
            <b>Dati di utilizzo</b>: esercizi svolti, progressi, interazioni,
            chat con tutor o AI, preferenze.
          </li>
          <li>
            <b>Comunicazioni</b>: email di supporto, ticket, messaggi inviati via
            canali integrati (WhatsApp, Instagram, ecc.).
          </li>
        </ul>
      </Section>

      <Section id="3" title="3. Finalità e basi giuridiche">
        <ul className="list-disc pl-5">
          <li>
            Erogazione e gestione del servizio educativo digitale (
            <i>contratto</i>).
          </li>
          <li>
            Pagamenti, fatturazione, adempimenti fiscali (<i>legge</i> /
            <i>contratto</i>).
          </li>
          <li>
            Creazione account, sincronizzazione progressi, invio email
            transazionali (<i>contratto</i>).
          </li>
          <li>
            Supporto clienti, sicurezza, prevenzione abusi (<i>legittimo
            interesse</i> / <i>legge</i>).
          </li>
          <li>
            Analisi d’uso e miglioramento del prodotto (<i>legittimo interesse</i>
            ).
          </li>
          <li>
            Comunicazioni promozionali o newsletter (<i>consenso</i> revocabile).
          </li>
        </ul>
      </Section>

      <Section id="4" title="4. Fornitori / Responsabili esterni (art. 28 GDPR)">
        <p>
          I dati possono essere trattati da fornitori nominati Responsabili del
          trattamento:
        </p>
        <ul className="list-disc pl-5">
          <li>
            <b>Stripe, Inc.</b> – pagamenti e fatturazione (USA, SCC
            2021/914).
          </li>
          <li>
            <b>Google LLC / Firebase</b> – autenticazione, database, analytics,
            hosting (USA/UE, SCC 2021/914).
          </li>
          <li>
            <b>Sanity AS</b> – gestione contenuti (UE/EEA).
          </li>
          <li>
            <b>Vercel Inc.</b> – hosting Next.js e performance (USA, SCC
            2021/914).
          </li>
          <li>
            <b>Resend / Twilio SendGrid</b> – email transazionali (USA, SCC
            2021/914).
          </li>
          <li>
            <b>Supabase</b> – database/chat (UE/USA, SCC 2021/914).
          </li>
          <li>
            <b>Meta Platforms</b> – canali WhatsApp / Instagram se l’utente
            comunica tramite tali canali.
          </li>
        </ul>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          L’elenco potrà variare; versioni aggiornate sono disponibili su
          richiesta all’indirizzo email di supporto.
        </p>
      </Section>

      <Section id="5" title="5. Trasferimenti extra UE">
        <p>
          Se i dati sono trasferiti al di fuori dello Spazio Economico Europeo,
          Theoremz applica le Clausole Contrattuali Standard (Decisione
          2021/914) e, se necessario, misure supplementari idonee a garantire un
          livello di protezione equivalente a quello UE.
        </p>
      </Section>

      <Section id="6" title="6. Periodi di conservazione">
        <ul className="list-disc pl-5">
          <li>Account: fino a richiesta di cancellazione o inattività &gt; 24 mesi.</li>
          <li>Fatturazione: 10 anni per obblighi civilistici/fiscali.</li>
          <li>Log tecnici: fino a 12 mesi.</li>
          <li>Messaggistica e progressi: per tutta la durata del servizio e fino a 24 mesi dalla cessazione.</li>
        </ul>
      </Section>

      <Section id="7" title="7. Diritti dell’utente (artt. 15-22 GDPR)">
        <p>
          Gli utenti possono esercitare i diritti di accesso, rettifica,
          cancellazione, limitazione, opposizione, portabilità, revoca del
          consenso e reclamo all’autorità di controllo.
        </p>
      </Section>

      <Section id="8" title="8. Come esercitare i diritti">
        <p>
          È possibile inviare una richiesta all’indirizzo{" "}
          <a href={`mailto:${legal.supportEmail}`} className="underline">
            {legal.supportEmail}
          </a>
          . Il Titolare risponderà entro 30 giorni, salvo complessità del caso.
        </p>
      </Section>

      <Section id="9" title="9. Sicurezza">
        <p>
          Theoremz adotta misure tecniche e organizzative adeguate (crittografia
          TLS, controllo accessi, logging, backup) per proteggere i dati da
          accessi non autorizzati, perdita o divulgazione.
        </p>
      </Section>

      <Section id="10" title="10. Cookie">
        <p>
          Per informazioni dettagliate sui cookie utilizzati e sulla gestione del
          consenso consulta la{" "}
          {renderLink(legal.cookieUrl, "Cookie Policy dedicata")}.
        </p>
      </Section>

      <Section id="11" title="11. Comunicazioni marketing">
        <p>
          Le email promozionali sono inviate solo previo consenso espresso e
          possono essere disiscritte in qualunque momento tramite link in fondo
          ai messaggi o contattando il supporto.
        </p>
      </Section>

      <Section id="12" title="12. Trattamento dei minori">
        <p>
          L’uso del servizio da parte di minori di 18 anni è consentito solo con
          il consenso e sotto la responsabilità del genitore o tutore che
          diventa l’effettivo titolare del contratto.
        </p>
      </Section>

      <Section id="13" title="13. Modifiche alla Privacy Policy">
        <p>
          Theoremz può aggiornare l’informativa con preavviso ragionevole.
          L’utilizzo continuato del servizio dopo la pubblicazione vale come
          accettazione delle modifiche.
        </p>
      </Section>

      <Section id="14" title="14. Contatti">
        <table className="w-full border-collapse text-[15px]">
          <tbody>
            <tr className="border border-slate-200 dark:border-slate-800">
              <td className="bg-slate-50 dark:bg-slate-900/40 p-2 font-medium">
                Titolare
              </td>
              <td className="p-2">{legal.companyName}</td>
            </tr>
            <tr className="border border-slate-200 dark:border-slate-800">
              <td className="bg-slate-50 dark:bg-slate-900/40 p-2 font-medium">
                P. IVA
              </td>
              <td className="p-2">{legal.vatNumber}</td>
            </tr>
            <tr className="border border-slate-200 dark:border-slate-800">
              <td className="bg-slate-50 dark:bg-slate-900/40 p-2 font-medium">
                Sede legale
              </td>
              <td className="p-2">{legal.registeredAddress}</td>
            </tr>
            <tr className="border border-slate-200 dark:border-slate-800">
              <td className="bg-slate-50 dark:bg-slate-900/40 p-2 font-medium">
                Email
              </td>
              <td className="p-2">
                <a href={`mailto:${legal.supportEmail}`} className="underline">
                  {legal.supportEmail}
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

    </main>
  );
}
