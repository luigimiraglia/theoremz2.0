// app/termini-di-servizio/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { getLegalInfo } from "@/lib/legal";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Termini di Servizio | Theoremz",
  description:
    "Termini di Servizio per l’uso della piattaforma Theoremz, piani gratuiti e abbonamenti a pagamento, gestione, rimborsi, privacy e cookie.",
  openGraph: {
    title: "Termini di Servizio | Theoremz",
    description:
      "Regole per l’utilizzo della piattaforma Theoremz e dei piani a pagamento.",
    url: "https://theoremz.com/termini-di-servizio",
    siteName: "Theoremz",
    type: "article",
  },
  alternates: { canonical: "https://theoremz.com/termini-di-servizio" },
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

export default function TermsPage() {
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
    name: "Termini di Servizio | Theoremz",
    dateModified: "2025-11-10",
    url: "https://theoremz.com/termini-di-servizio",
    inLanguage: "it-IT",
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 text-slate-900 dark:text-slate-100 transition-colors bg-white/95 dark:bg-slate-950/95 rounded-3xl shadow-sm">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([orgSchema, webPageSchema]),
        }}
      />

      {/* Header */}
      <header className="mb-5 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="text-[#1155ff]">
          ← Torna alla home
        </Link>
        <div>
          Ultimo aggiornamento: <b>{lastUpdate}</b>
        </div>
      </header>

      {/* Title */}
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Termini di Servizio
      </h1>
      <p className="mt-2 rounded-lg border border-[#dbe7ff] dark:border-slate-800 bg-[#eef4ff] dark:bg-slate-900/60 p-3 text-[15px] text-slate-800 dark:text-slate-100">
        Questo documento disciplina l’uso della piattaforma Theoremz e dei
        relativi piani gratuiti e a pagamento. Creando un account o effettuando
        un acquisto l’utente dichiara di aver letto e accettato questi Termini.
      </p>

      {/* TOC */}
      <nav
        aria-label="Indice"
        className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfcff] dark:bg-slate-900/40 p-4 text-[15px]"
      >
        <strong>Indice</strong>
        <ol className="mt-2 list-decimal pl-5">
          <li>
            <a href="#1" className="text-[#1155ff] underline">
              Parti, definizioni e ambito
            </a>
          </li>
          <li>
            <a href="#2" className="text-[#1155ff] underline">
              Requisiti per l’account
            </a>
          </li>
          <li>
            <a href="#3" className="text-[#1155ff] underline">
              Oggetto del servizio e piani
            </a>
          </li>
          <li>
            <a href="#4" className="text-[#1155ff] underline">
              Abbonamenti e pagamenti
            </a>
          </li>
          <li>
            <a href="#5" className="text-[#1155ff] underline">
              Attivazione, accesso e disponibilità
            </a>
          </li>
          <li>
            <a href="#6" className="text-[#1155ff] underline">
              Gestione abbonamento e disdetta
            </a>
          </li>
          <li>
            <a href="#7" className="text-[#1155ff] underline">
              Diritto di recesso e rimborsi
            </a>
          </li>
          <li>
            <a href="#8" className="text-[#1155ff] underline">
              Condotta dell’utente e divieti
            </a>
          </li>
          <li>
            <a href="#9" className="text-[#1155ff] underline">
              Proprietà intellettuale
            </a>
          </li>
          <li>
            <a href="#10" className="text-[#1155ff] underline">
              Privacy, cookie e sicurezza
            </a>
          </li>
          <li>
            <a href="#11" className="text-[#1155ff] underline">
              Limitazione di responsabilità
            </a>
          </li>
          <li>
            <a href="#12" className="text-[#1155ff] underline">
              Modifiche ai Termini
            </a>
          </li>
          <li>
            <a href="#13" className="text-[#1155ff] underline">
              Legge applicabile e foro competente
            </a>
          </li>
          <li>
            <a href="#14" className="text-[#1155ff] underline">
              Contatti e informazioni legali
            </a>
          </li>
        </ol>
      </nav>

      {/* Sections */}
      <Section id="1" title="1. Parti, definizioni e ambito">
        <p>
          I presenti Termini di Servizio regolano l’utilizzo della piattaforma
          online di Theoremz (“Piattaforma”, “Servizio”) gestita da{" "}
          <b>{legal.companyName}</b> (P. IVA <b>{legal.vatNumber}</b>, sede
          legale <b>{legal.registeredAddress}</b>, email{" "}
          <a href={`mailto:${legal.supportEmail}`} className="underline">
            {legal.supportEmail}
          </a>
          ). “Utente” indica la persona fisica che crea un account o utilizza la
          Piattaforma. L’accesso o l’uso del Servizio comportano l’accettazione
          integrale dei presenti Termini.
        </p>
      </Section>

      <Section id="2" title="2. Requisiti per l’account">
        <ul className="list-disc pl-5">
          <li>
            Per creare un account è necessario fornire informazioni veritiere e
            mantenerle aggiornate.
          </li>
          <li>
            I minori possono usare la Piattaforma solo con consenso e sotto la
            responsabilità del genitore o tutore.
          </li>
          <li>
            Le credenziali sono personali. L’Utente è responsabile della loro
            custodia e delle attività svolte con il proprio account.
          </li>
        </ul>
      </Section>

      <Section id="3" title="3. Oggetto del servizio e piani">
        <p>
          Theoremz offre contenuti e strumenti didattici digitali per studenti,
          con piani gratuiti e piani a pagamento (ad esempio Essential, Black,
          Mentor). Le funzionalità e i prezzi aggiornati sono indicati sulla
          Piattaforma.
        </p>
      </Section>

      <Section id="4" title="4. Abbonamenti e pagamenti">
        <ul className="list-disc pl-5">
          <li>
            I pagamenti ricorrenti sono gestiti tramite fornitori terzi (es.
            Stripe) e addebitati in anticipo al periodo di riferimento.
          </li>
          <li>
            Confermando l’acquisto l’Utente accetta l’attivazione immediata dei
            contenuti digitali. L’Utente prende atto e accetta la rinuncia al
            diritto di recesso ai sensi dell’art. 59 lett. o) del D. Lgs.
            206/2005.
          </li>
          <li>
            Theoremz può modificare prezzi o condizioni con preavviso
            ragionevole. L’Utente può disdire prima del successivo rinnovo.
          </li>
        </ul>
      </Section>

      <Section id="5" title="5. Attivazione, accesso e disponibilità">
        <p>
          L’accesso alle funzionalità del piano acquistato è attivato alla
          conferma del pagamento. Theoremz può sospendere temporaneamente
          l’accesso per manutenzione, aggiornamenti o sicurezza, cercando di
          ridurre i disagi.
        </p>
      </Section>

      <Section id="6" title="6. Gestione abbonamento e disdetta">
        <ul className="list-disc pl-5">
          <li>
            L’Utente può gestire l’abbonamento dalla pagina dedicata o
            contattando il supporto. Link consigliato:{" "}
            {renderLink(legal.manageBillingUrl, legal.manageBillingUrl)}.
          </li>
          <li>
            La disdetta interrompe il rinnovo automatico alla scadenza del
            periodo già pagato. Salvo diversa indicazione non sono previsti
            rimborsi pro-rata.
          </li>
        </ul>
      </Section>

      <Section id="7" title="7. Diritto di recesso e rimborsi">
        <p>
          Per i contenuti digitali attivati subito dopo l’acquisto il diritto di
          recesso non si applica, previa accettazione espressa dell’Utente. In
          casi specifici Theoremz può valutare rimborsi discrezionali.
        </p>
      </Section>

      <Section id="8" title="8. Condotta dell’utente e divieti">
        <ul className="list-disc pl-5">
          <li>Divieto di copiare, distribuire o rivendere i contenuti.</li>
          <li>Divieto di aggirare misure tecniche di protezione.</li>
          <li>
            Divieto di utilizzo illecito o lesivo dei diritti di terzi, incluso
            l’invio di contenuti illeciti o offensivi.
          </li>
        </ul>
      </Section>

      <Section id="9" title="9. Proprietà intellettuale">
        <p>
          Tutti i contenuti della Piattaforma sono di proprietà di Theoremz o
          concessi in licenza. L’Utente ottiene una licenza d’uso limitata,
          personale, non esclusiva e revocabile per finalità di studio.
        </p>
      </Section>

      <Section id="10" title="10. Privacy, cookie e sicurezza">
        <ul className="list-disc pl-5">
          <li>
            Il trattamento dei dati personali avviene nel rispetto del GDPR e
            della normativa italiana. Dettagli nella{" "}
            {renderLink(legal.privacyUrl, "Privacy Policy")}.
          </li>
          <li>
            Per informazioni sui cookie consultare la{" "}
            {renderLink(legal.cookieUrl, "Cookie Policy")}.
          </li>
          <li>
            Theoremz adotta misure ragionevoli di sicurezza tecnica e
            organizzativa per proteggere i dati.
          </li>
        </ul>
      </Section>

      <Section id="11" title="11. Limitazione di responsabilità">
        <p>
          Il Servizio è fornito “così com’è”. Theoremz non garantisce risultati
          scolastici specifici. Entro i limiti consentiti dalla legge la
          responsabilità complessiva non eccede quanto pagato dall’Utente nel
          mese precedente l’evento che ha generato la pretesa.
        </p>
      </Section>

      <Section id="12" title="12. Modifiche ai Termini">
        <p>
          Theoremz può aggiornare i Termini con preavviso ragionevole, tramite
          la Piattaforma o email. L’uso continuato dopo la data di efficacia
          comporta accettazione delle modifiche.
        </p>
      </Section>

      <Section id="13" title="13. Legge applicabile e foro competente">
        <p>
          I presenti Termini sono regolati dalla legge italiana. Per le
          controversie è competente il Foro del consumatore. In alternativa
          indicare il foro della sede legale: <b>{legal.competentCourt}</b>.
        </p>
      </Section>

      <Section id="14" title="14. Contatti e informazioni legali">
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
                Email supporto
              </td>
              <td className="p-2">
                <a href={`mailto:${legal.supportEmail}`} className="underline">
                  {legal.supportEmail}
                </a>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          In caso di incongruenze tra versioni tradotte e la versione italiana,
          prevale la versione italiana.
        </p>
      </Section>

    </main>
  );
}
