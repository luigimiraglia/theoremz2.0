import Image from "next/image";
import Hero from "./components/Hero";

export default function Home() {
  return (
    <>
      <Hero />
      <article className="prose max-w-none p-6">
        <h2>Sezione di Esempio</h2>
        <p>
          Questo è un testo di esempio utilizzato per riempire lo spazio e
          simulare il contenuto definitivo. Le frasi non hanno significato
          compiuto ma servono a mostrare la formattazione visiva di paragrafi,
          liste e titoli.
        </p>
        <p>
          In questa sezione potresti parlare dell’argomento principale, inserire
          definizioni, esempi e spiegazioni passo‑passo. Ricorda di alternare
          testo, immagini e box di codice per rendere la pagina più leggibile.
        </p>
        <h3>Punti Chiave</h3>
        <ul>
          <li>Punto 1: Descrivi brevemente un aspetto chiave.</li>
          <li>Punto 2: Aggiungi un secondo punto di approfondimento.</li>
          <li>
            Punto 3: Chiudi con un riepilogo o un collegamento ad un’ulteriore
            risorsa.
          </li>
        </ul>
        <p>
          Per concludere, questa frase serve a chiudere il paragrafo di esempio
          e a introdurre eventuali call‑to‑action, inviti a esercitarti o link a
          materiali aggiuntivi.
        </p>
        <div className="mt-8">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Prosegui con la Lezione
          </button>
        </div>
      </article>
    </>
  );
}
