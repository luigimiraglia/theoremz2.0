import type { Metadata } from "next";
import MobileGuideDownloadGate from "./MobileGuideDownloadGate";
import PrintButton from "./PrintButton";

export const metadata: Metadata = {
  title: "Da 4 a 6 — Guida pratica per recuperare matematica",
  description:
    "Il sistema completo per recuperare matematica senza perdere l'estate: diagnosi, piano 30 giorni, metodo, esempi guidati e strategia da verifica.",
  alternates: { canonical: "/guida-da-4-a-6" },
  openGraph: {
    title: "Da 4 a 6 — Guida pratica Theoremz",
    description:
      "Il sistema completo per recuperare matematica: diagnosi, piano 30 giorni, metodo Theoremz, esempi e strategia da verifica.",
    url: "https://theoremz.com/guida-da-4-a-6",
    siteName: "Theoremz",
    images: [{ url: "/metadata.png" }],
    type: "website",
    locale: "it_IT",
  },
  robots: { index: true, follow: true },
};

export default function GuidaDa4A6() {
  return (
    <>
      <style>{guideCSS}</style>

      <div className="guide-mobile-only no-print">
        <MobileGuideDownloadGate />
      </div>

      {/* Floating PDF button — hidden on print and mobile */}
      <div className="guide-pdf-fab no-print">
        <PrintButton downloadUrl="/pdf/theoremz_guida_da_4_a_6.pdf" />
      </div>

      <main className="guide-page guide-desktop-only">
        <div className="page">
          <header className="topbar">
            <div className="brand-lockup">
              <div className="brand-mark">T</div>
              <div>Theoremz</div>
            </div>
            <div className="tag">Guida pratica per recuperare matematica senza perdere l&apos;estate</div>
          </header>

          <div className="hero">
            <div className="hero-card">
              <div className="eyebrow">Guida anti-debito</div>
              <h1>Da 4 a 6</h1>
              <p className="subtitle">Il sistema semplice per capire cosa ti blocca, recuperare gli argomenti giusti e arrivare alla verifica di settembre con un piano vero.</p>
              <div className="hero-actions">
                <span className="pill">30 giorni</span>
                <span className="pill">zero teoria inutile</span>
                <span className="pill">checklist + esercizi</span>
                <span className="pill">metodo Theoremz</span>
              </div>
              <p className="print-note">Consiglio: esporta in PDF e tienila sul telefono. Ogni giorno devi solo seguire il blocco indicato.</p>
            </div>

            <aside className="side-card">
              <div>
                <div className="score-box">
                  <div className="mini-label">Obiettivo reale</div>
                  <div className="score-number">6</div>
                  <p>Non devi diventare un genio in un mese. Devi trasformare gli errori ripetuti in punti facili.</p>
                </div>
                <h2>Questa guida è per te se...</h2>
                <ul>
                  <li>hai preso il debito o rischi di portartelo dietro;</li>
                  <li>studi, ma in verifica ti sembra tutto diverso;</li>
                  <li>non sai da dove iniziare e perdi tempo a rileggere teoria;</li>
                  <li>vuoi un piano concreto, non frasi motivazionali.</li>
                </ul>
              </div>
            </aside>
          </div>

          <nav className="toc">
            <h2>Dentro trovi il sistema completo</h2>
            <p className="lead">Questa non è una lista di &quot;consigli per studiare meglio&quot;. È una guida operativa: diagnosi, piano, metodo, esercizi, correzione degli errori e strategia da verifica.</p>
            <div className="toc-grid">
              <a href="#mindset"><span>01</span> La verità sul recupero</a>
              <a href="#diagnosi"><span>02</span> Diagnosi in 20 minuti</a>
              <a href="#metodo"><span>03</span> Metodo Theoremz</a>
              <a href="#piano"><span>04</span> Piano 30 giorni</a>
              <a href="#argomenti"><span>05</span> Come attaccare un argomento</a>
              <a href="#esempi"><span>06</span> Esempi guidati</a>
              <a href="#verifica"><span>07</span> Strategia da verifica</a>
              <a href="#emergenza"><span>08</span> Se hai solo 7 giorni</a>
              <a href="#template"><span>09</span> Template pronti</a>
            </div>
          </nav>

          {/* 1 */}
          <section id="mindset">
            <h2>1. La verità: non devi &quot;studiare tutto&quot;</h2>
            <p className="lead">Il modo più veloce per fallire un recupero è aprire il libro da pagina 1 e provare a rifare tutto. Sembra serio, ma è una trappola: ti fa sentire occupato senza renderti più pronto.</p>
            <div className="quote">
              Il 6 non arriva perché hai ripassato più pagine. Arriva perché hai eliminato gli errori che ti facevano perdere punti sempre nello stesso modo.
              <small>Metodo Theoremz: meno confusione, più esercizi giusti, correzione feroce.</small>
            </div>
            <h3>La differenza tra studiare e prepararsi</h3>
            <div className="grid-2">
              <div className="card">
                <span className="mini-label">Studiare male</span>
                <ul>
                  <li>Rileggi la teoria finché &quot;ti sembra di capirla&quot;.</li>
                  <li>Guardi esercizi svolti e pensi: &quot;sì, questo l&apos;ho capito&quot;.</li>
                  <li>Fai solo esercizi simili agli esempi del libro.</li>
                  <li>Correggi guardando la soluzione, ma non scrivi perché hai sbagliato.</li>
                  <li>Il giorno dopo ricominci da capo perché non hai un sistema.</li>
                </ul>
              </div>
              <div className="card dark">
                <span className="mini-label">Prepararsi bene</span>
                <ul>
                  <li>Capisci quali argomenti valgono più punti.</li>
                  <li>Alleni i tipi di esercizio che il prof mette davvero.</li>
                  <li>Rifai da solo gli esercizi senza guardare la soluzione.</li>
                  <li>Tieni un registro degli errori e li trasformi in checklist.</li>
                  <li>Simuli la verifica prima della verifica vera.</li>
                </ul>
              </div>
            </div>
            <div className="warning">
              <strong>Regola brutale:</strong> se dopo 40 minuti di studio non hai prodotto almeno un esercizio corretto, una correzione scritta o una checklist di errori, probabilmente non stai studiando: stai solo consumando tempo.
            </div>
            <h3>Il tuo obiettivo non è &quot;capire matematica&quot; in generale</h3>
            <p>Il tuo obiettivo è più piccolo e molto più concreto:</p>
            <ol>
              <li>riconoscere il tipo di esercizio;</li>
              <li>sapere il primo passaggio da fare;</li>
              <li>non bloccarti se cambia un numero;</li>
              <li>controllare i segni e i calcoli;</li>
              <li>arrivare a un risultato leggibile e difendibile.</li>
            </ol>
            <p>Questo è il punto: un 6 in matematica spesso non richiede brillantezza. Richiede ordine. Se sei disordinato, perdi punti anche quando &quot;più o meno sai&quot;. Se diventi ordinato, inizi a prendere punti anche quando non sei perfetto.</p>
          </section>

          {/* 2 */}
          <section id="diagnosi">
            <h2>2. Diagnosi in 20 minuti: perché stai prendendo 4 o 5?</h2>
            <p className="lead">Prima di fare il piano devi capire dove si rompe il sistema. Non basta dire &quot;non capisco matematica&quot;. È troppo vago. Devi trovare il collo di bottiglia.</p>
            <div className="grid-2">
              <div className="card"><h3>A. Problema di basi</h3><p>Ti blocchi perché mancano pezzi precedenti: frazioni, potenze, equazioni, scomposizioni, segni, parentesi.</p><p><strong>Segnale:</strong> capisci la spiegazione del prof, ma sbagli i passaggi tecnici.</p></div>
              <div className="card"><h3>B. Problema di riconoscimento</h3><p>Sai fare l&apos;esercizio quando ti dicono che tipo è, ma in verifica non capisci quale metodo usare.</p><p><strong>Segnale:</strong> guardi il foglio e pensi: &quot;da dove inizio?&quot;</p></div>
              <div className="card"><h3>C. Problema di autonomia</h3><p>Con la soluzione davanti sembra tutto chiaro, ma da solo ti perdi al secondo passaggio.</p><p><strong>Segnale:</strong> dici spesso &quot;l&apos;avevo capito, ma non mi veniva&quot;.</p></div>
              <div className="card"><h3>D. Problema da verifica</h3><p>A casa fai gli esercizi, ma in classe sbagli per ansia, tempo, disordine o controllo finale assente.</p><p><strong>Segnale:</strong> perdi punti per errori &quot;stupidi&quot;, ma ripetuti.</p></div>
            </div>
            <h3>Test rapido</h3>
            <p>Prendi un argomento del debito e scegli 6 esercizi: 2 facili, 2 medi, 2 simili a quelli della verifica. Fai tutto in 35 minuti, senza telefono, senza soluzione aperta.</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Risultato</th><th>Cosa significa</th><th>Cosa devi fare</th></tr></thead>
                <tbody>
                  <tr><td>Non riesci a partire</td><td>Non riconosci il tipo di esercizio o non sai il primo passaggio.</td><td>Studia per categorie: &quot;quando vedo questo, faccio questo&quot;.</td></tr>
                  <tr><td>Parti bene ma ti perdi</td><td>Hai un problema di procedura o di passaggi intermedi.</td><td>Rifai esercizi svolti coprendo la soluzione dopo ogni riga.</td></tr>
                  <tr><td>Arrivi quasi sempre ma sbagli calcoli</td><td>Le basi algebriche ti stanno sabotando.</td><td>Fai 20 minuti al giorno solo di calcolo tecnico.</td></tr>
                  <tr><td>A casa ok, in simulazione male</td><td>Non sei allenato al tempo e alla pressione.</td><td>Fai simulazioni brevi con timer e correzione immediata.</td></tr>
                </tbody>
              </table>
            </div>
            <div className="success">
              <strong>Output della diagnosi:</strong> alla fine devi scrivere una frase precisa. Esempio: &quot;Non ho un problema sulle derivate in generale. Ho un problema nel riconoscere quando usare prodotto, quoziente e catena, e perdo segni nei passaggi&quot;. Questa frase vale più di tre ore di studio casuale.
            </div>
          </section>

          {/* 3 */}
          <section id="metodo">
            <h2>3. Il Metodo Theoremz: 6 passaggi per imparare davvero</h2>
            <p className="lead">Il problema della maggior parte degli studenti è che confondono familiarità con competenza. Vedere un esercizio svolto non significa saperlo fare. Capire una spiegazione non significa saperla usare sotto pressione.</p>
            <div className="stepper">
              {[
                { title: "Guarda un esempio, ma solo uno", body: "Leggi un esercizio svolto per capire la struttura. Non guardarne dieci. Dopo il primo, devi passare all'azione." },
                { title: "Copri la soluzione e rifai da zero", body: "Questo è il passaggio che quasi nessuno fa. Se non riesci a rifarlo senza guardare, non lo sai ancora." },
                { title: "Spiega il perché di ogni passaggio", body: 'Non scrivere solo conti. Accanto ai passaggi chiave scrivi: "porto tutto a sinistra", "raccolgo", "uso la formula", "controllo il dominio".' },
                { title: "Cambia un dato", body: "Prendi lo stesso esercizio e modifica un numero, un segno o una condizione. Se crolli appena cambia il testo, avevi memorizzato, non capito." },
                { title: "Scrivi l'errore nel registro", body: 'Ogni errore deve diventare una regola personale. Non "sono scarso", ma "quando porto un termine dall\'altra parte dimentico di cambiare segno".' },
                { title: "Rifai dopo 24 ore", body: "Se lo sai solo subito dopo averlo visto, non lo possiedi. Devi rifarlo il giorno dopo, a freddo." },
              ].map((s) => (
                <div className="step" key={s.title}>
                  <div><h3>{s.title}</h3><p>{s.body}</p></div>
                </div>
              ))}
            </div>
            <h3>La regola 3-2-1 per ogni micro-argomento</h3>
            <div className="grid-3">
              <div className="card"><span className="mini-label">3 esercizi base</span><p>Servono per imparare la procedura pulita, senza trappole.</p></div>
              <div className="card"><span className="mini-label">2 esercizi medi</span><p>Servono per capire se sai scegliere i passaggi da solo.</p></div>
              <div className="card"><span className="mini-label">1 esercizio verifica</span><p>Serve per testare tempo, ordine, difficoltà reale e gestione degli errori.</p></div>
            </div>
            <div className="callout">
              <strong>Metodo pratico:</strong> per ogni argomento non partire da 40 esercizi. Parti da 6 esercizi scelti bene. Se li fai male, correggi. Se li fai bene, sali di livello. Il volume senza correzione è rumore.
            </div>
          </section>

          {/* 4 */}
          <section id="piano">
            <h2>4. Piano 30 giorni: cosa fare ogni giorno</h2>
            <p className="lead">Questo piano è costruito per chi deve recuperare matematica senza studiare 5 ore al giorno. Richiede costanza vera: 60-90 minuti al giorno, fatti bene, battono 4 ore casuali ogni tanto.</p>
            <div className="badge-row">
              <span className="badge">Durata: 30 giorni</span>
              <span className="badge">Tempo: 60-90 min/giorno</span>
              <span className="badge">Obiettivo: sufficienza solida</span>
              <span className="badge">Metodo: diagnosi → esercizi → simulazione</span>
            </div>
            <h3>Settimana 1 — Ricostruisci le fondamenta</h3>
            <p>Questa settimana non devi ancora &quot;fare il programma&quot;. Devi eliminare i buchi che ti fanno sbagliare tutto il resto.</p>
            <div className="timeline">
              {[
                ["Giorno 1", "Diagnosi: scegli 6 esercizi misti e capisci dove ti rompi. Scrivi i 3 errori più gravi."],
                ["Giorno 2", "Calcolo tecnico: frazioni, potenze, parentesi, segni. Fai 25 esercizi brevi, correggili subito."],
                ["Giorno 3", "Equazioni e disequazioni base: non andare avanti finché non sai isolare l'incognita senza errori."],
                ["Giorno 4", "Scomposizioni e prodotti notevoli, se presenti nel tuo programma. Obiettivo: riconoscere la forma, non memorizzare a caso."],
                ["Giorno 5", 'Ripasso del primo argomento del debito: crea la scheda "quando lo vedo, cosa faccio".'],
                ["Giorno 6", "Prima mini-simulazione: 30 minuti, 4 esercizi. Correzione feroce."],
                ["Giorno 7", "Recupero errori: rifai solo gli esercizi sbagliati. Se li sbagli ancora, hai trovato il problema vero."],
              ].map(([day, text]) => (
                <div className="day" key={day}><strong>{day}</strong><div>{text}</div></div>
              ))}
            </div>
            <h3>Settimana 2 — Costruisci automatismi</h3>
            <p>Ora devi smettere di &quot;capire quando guardi&quot; e iniziare a saper fare da solo. La parola chiave è automatismo: vedere una forma e sapere il primo passaggio.</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Giorni</th><th>Focus</th><th>Output obbligatorio</th></tr></thead>
                <tbody>
                  <tr><td>8-9</td><td>Argomento 1: esercizi base + medi.</td><td>Almeno 12 esercizi corretti e 5 errori scritti nel registro.</td></tr>
                  <tr><td>10-11</td><td>Argomento 2: procedura + riconoscimento.</td><td>Scheda con 3 casi tipici e 3 errori tipici.</td></tr>
                  <tr><td>12</td><td>Esercizi misti argomento 1 + 2.</td><td>Devi distinguere il metodo senza che il titolo lo suggerisca.</td></tr>
                  <tr><td>13</td><td>Simulazione breve.</td><td>45 minuti, timer, correzione, voto stimato.</td></tr>
                  <tr><td>14</td><td>Giorno riparazione.</td><td>Rifai gli errori e crea la checklist anti-errore.</td></tr>
                </tbody>
              </table>
            </div>
            <h3>Settimana 3 — Passa agli esercizi da verifica</h3>
            <p>Qui molti studenti si illudono: fanno bene esercizi facili e pensano di essere pronti. No. La verifica contiene esercizi sporchi: testi meno guidati, numeri meno comodi, passaggi combinati.</p>
            <div className="grid-2">
              <div className="card"><h4>Cosa fare</h4><ul><li>Prendi verifiche vecchie, esercizi del prof o esercizi finali del capitolo.</li><li>Fai blocchi da 35-50 minuti con timer.</li><li>Non guardare la soluzione finché non hai scritto un tentativo completo.</li><li>Segna ogni punto in cui ti sei bloccato.</li></ul></div>
              <div className="card"><h4>Cosa evitare</h4><ul><li>Fare solo gli esercizi già svolti in classe.</li><li>Saltare quelli brutti perché &quot;tanto non usciranno&quot;.</li><li>Dire &quot;ho sbagliato per distrazione&quot; senza scrivere l&apos;errore preciso.</li><li>Studiare teoria per evitare il disagio degli esercizi difficili.</li></ul></div>
            </div>
            <h3>Settimana 4 — Simula, correggi, consolida</h3>
            <p>Ultima fase: devi diventare stabile. Un giorno buono non basta. Devi riuscire a prendere almeno 6 in simulazione più volte.</p>
            <div className="timeline">
              {[
                ["Giorno 22", "Simulazione completa 1. Voto stimato. Correzione con registro errori."],
                ["Giorno 23", "Riparazione mirata: rifai solo ciò che ti ha fatto perdere punti."],
                ["Giorno 24", "Argomento debole numero 1: 3 base, 2 medi, 1 verifica."],
                ["Giorno 25", "Argomento debole numero 2: stesso schema."],
                ["Giorno 26", "Simulazione completa 2. Obiettivo: meno errori ripetuti, non perfezione."],
                ["Giorno 27", "Checklist personale: raccogli i 10 errori che fai più spesso."],
                ["Giorno 28", "Ripasso leggero + esercizi misti. Niente maratone."],
                ["Giorno 29", "Simulazione finale breve. Devi vedere se il 6 è stabile."],
                ["Giorno 30", "Preparazione mentale e logistica: materiali, formule, strategia tempo, sonno."],
              ].map(([day, text]) => (
                <div className="day" key={day}><strong>{day}</strong><div>{text}</div></div>
              ))}
            </div>
            <div className="warning">
              <strong>Non barare sul piano:</strong> se salti 5 giorni e poi fai una maratona, non stai seguendo il metodo. La matematica premia la ripetizione distribuita, non l&apos;eroismo dell&apos;ultimo giorno.
            </div>
          </section>

          {/* 5 */}
          <section id="argomenti">
            <h2>5. Come attaccare qualsiasi argomento</h2>
            <p className="lead">Ogni argomento va trasformato in una mappa pratica. Non devi scrivere pagine di teoria. Devi creare una scheda che ti dice cosa riconoscere, cosa fare e quali errori evitare.</p>
            <h3>La scheda perfetta per un argomento</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Parte</th><th>Domanda guida</th><th>Esempio</th></tr></thead>
                <tbody>
                  <tr><td>Definizione utile</td><td>Che cosa devo sapere per iniziare?</td><td>Una funzione è derivabile se esiste il limite del rapporto incrementale.</td></tr>
                  <tr><td>Segnali nel testo</td><td>Come capisco che devo usare questo metodo?</td><td>Se vedo &quot;tangente&quot;, &quot;velocità istantanea&quot;, &quot;massimo/minimo&quot;, penso alle derivate.</td></tr>
                  <tr><td>Procedura</td><td>Quali passaggi faccio sempre?</td><td>Calcolo derivata, studio segno, trovo intervalli di crescita e decrescita.</td></tr>
                  <tr><td>Errori tipici</td><td>Dove perdo punti?</td><td>Dimentico il dominio, sbaglio il segno, confondo massimo con minimo.</td></tr>
                  <tr><td>Esercizio campione</td><td>Qual è l&apos;esercizio che rappresenta bene il tema?</td><td>Studio di una funzione semplice con dominio, zeri, segno, derivata.</td></tr>
                </tbody>
              </table>
            </div>
            <h3>La tecnica &quot;primo passaggio&quot;</h3>
            <p>Molti studenti non falliscono perché non sanno tutto. Falliscono perché non sanno iniziare. Per ogni tipo di esercizio devi memorizzare il primo passaggio corretto.</p>
            <div className="grid-2">
              <div className="exercise"><strong>Se vedi una frazione algebrica...</strong><p>Primo passaggio: controlla il denominatore e imponi che sia diverso da zero.</p><p className="formula">Esempio: (x + 1) / (x - 3) → x ≠ 3</p></div>
              <div className="exercise"><strong>Se vedi una radice con incognita...</strong><p>Primo passaggio: controlla che il radicando sia maggiore o uguale a zero.</p><p className="formula">Esempio: √(x - 2) → x ≥ 2</p></div>
              <div className="exercise"><strong>Se vedi un prodotto uguale a zero...</strong><p>Primo passaggio: usa la legge di annullamento del prodotto.</p><p className="formula">Esempio: (x - 1)(x + 4) = 0 → x = 1 oppure x = -4</p></div>
              <div className="exercise"><strong>Se vedi una funzione da studiare...</strong><p>Primo passaggio: dominio. Sempre. Prima di derivata, grafico, zeri, tutto.</p><p className="formula">Dominio → intersezioni → segno → limiti → derivata → grafico</p></div>
            </div>
            <div className="callout">
              <strong>Compito pratico:</strong> per ogni argomento del tuo debito scrivi almeno 5 frasi &quot;Se vedo ___, allora faccio ___&quot;. Questa è una delle armi più forti per non bloccarti in verifica.
            </div>
          </section>

          {/* 6 */}
          <section id="esempi">
            <h2>6. Esempi guidati: come si studia davvero</h2>
            <p className="lead">Qui non trovi una teoria completa di matematica. Trovi esempi di metodo: come trasformare un esercizio in competenza riutilizzabile.</p>
            <h3>Esempio 1 — Equazione di secondo grado</h3>
            <div className="exercise">
              <strong>Esercizio:</strong>
              <p className="formula">x² - 5x + 6 = 0</p>
              <p><strong>Riconoscimento:</strong> è un&apos;equazione di secondo grado in forma completa, con a = 1, b = -5, c = 6.</p>
              <p><strong>Metodo 1:</strong> scomposizione. Cerco due numeri che moltiplicati fanno 6 e sommati fanno -5: sono -2 e -3.</p>
              <p className="formula">x² - 5x + 6 = (x - 2)(x - 3)</p>
              <p>Quindi: <span className="formula">(x - 2)(x - 3) = 0 → x = 2 oppure x = 3</span></p>
              <p><strong>Errore tipico:</strong> trovare 2 e 3 ma dimenticare che devono essere -2 e -3 nella scomposizione. Il controllo finale evita l&apos;errore: se sostituisci x = 2, ottieni 4 - 10 + 6 = 0.</p>
            </div>
            <h4>Come trasformarlo in allenamento</h4>
            <ol>
              <li>Rifai l&apos;esercizio senza guardare.</li>
              <li>Cambia il termine noto: <span className="formula">x² - 7x + 12 = 0</span>.</li>
              <li>Cambia i segni: <span className="formula">x² + 5x + 6 = 0</span>.</li>
              <li>Prova un caso non scomponibile facilmente e usa la formula risolutiva.</li>
            </ol>
            <h3>Esempio 2 — Dominio di una funzione</h3>
            <div className="exercise">
              <strong>Esercizio:</strong>
              <p className="formula">f(x) = √(x - 1) / (x - 4)</p>
              <p><strong>Riconoscimento:</strong> ci sono due vincoli: una radice e un denominatore.</p>
              <p><strong>Vincolo 1:</strong> sotto radice deve essere maggiore o uguale a zero. <span className="formula">x - 1 ≥ 0 → x ≥ 1</span></p>
              <p><strong>Vincolo 2:</strong> il denominatore deve essere diverso da zero. <span className="formula">x - 4 ≠ 0 → x ≠ 4</span></p>
              <p><strong>Dominio finale:</strong> <span className="formula">x ≥ 1 e x ≠ 4</span></p>
              <p><strong>Errore tipico:</strong> scrivere solo x ≥ 1 e dimenticare x ≠ 4. In verifica questo è un punto regalato perso.</p>
            </div>
            <h4>Domanda che devi farti sempre</h4>
            <p>&quot;C&apos;è qualcosa che non posso fare?&quot; Non posso dividere per zero. Non posso fare radice quadrata di un numero negativo nei reali. Non posso fare logaritmo di un numero minore o uguale a zero. Il dominio nasce da queste domande, non da memoria cieca.</p>
            <h3>Esempio 3 — Derivata con prodotto</h3>
            <div className="exercise">
              <strong>Esercizio:</strong>
              <p className="formula">f(x) = x² · sin(x)</p>
              <p><strong>Riconoscimento:</strong> è un prodotto tra due funzioni: x² e sin(x).</p>
              <p><strong>Regola:</strong> derivata del primo per il secondo + primo per derivata del secondo.</p>
              <p className="formula">f&apos;(x) = 2x · sin(x) + x² · cos(x)</p>
              <p><strong>Errore tipico:</strong> derivare entrambi e moltiplicare: <span className="formula">2x · cos(x)</span>. È sbagliato. La derivata di un prodotto non è il prodotto delle derivate.</p>
            </div>
          </section>

          {/* 7 */}
          <section id="verifica">
            <h2>7. Strategia da verifica: come non buttare punti</h2>
            <p className="lead">La verifica non misura solo quanto sai. Misura anche ordine, tempo, sangue freddo e capacità di scegliere cosa fare prima.</p>
            <h3>Prima di iniziare: scansione in 90 secondi</h3>
            <p>Appena ricevi il compito, non partire subito. Leggi tutto e segna mentalmente:</p>
            <ul>
              <li>esercizi facili: li so fare quasi sicuramente;</li>
              <li>esercizi medi: so iniziare, ma devo stare attento;</li>
              <li>esercizi brutti: rischio di perdere troppo tempo.</li>
            </ul>
            <p>La strategia è semplice: prima punti sicuri, poi medi, poi difficili. Non sacrificare il 6 per orgoglio su un esercizio impossibile.</p>
            <h3>Checklist anti-5 prima di consegnare</h3>
            <div className="checkbox-list">
              {["Ho scritto il dominio quando serviva?","Ho controllato denominatori diversi da zero?","Ho controllato segni quando sposto termini?","Ho messo parentesi nei passaggi per evitare errori?","Ho scritto le soluzioni in modo chiaro?","Ho verificato almeno un risultato sostituendo?","Ho lasciato spazio tra gli esercizi per rendere leggibile la correzione?","Ho evitato di cancellare passaggi utili che potevano valere punti parziali?"].map(q => (
                <div className="check-item" key={q}><div className="box" /><div>{q}</div></div>
              ))}
            </div>
            <h3>Come gestire il blocco</h3>
            <div className="grid-2">
              <div className="card"><h4>Se non sai partire</h4><p>Scrivi ciò che sai: dominio, formule, dati, condizioni, grafico qualitativo. Anche un inizio parziale può sbloccare il ragionamento e dare punti.</p></div>
              <div className="card"><h4>Se ti perdi nei calcoli</h4><p>Torna all&apos;ultima riga sicura. Non aggiustare a caso. Un errore di segno si ripara; cinque righe costruite sopra un errore diventano una valanga.</p></div>
              <div className="card"><h4>Se un esercizio ti ruba tempo</h4><p>Metti un segno, vai avanti e torna dopo. Il tempo è punteggio. Restare bloccato 25 minuti su un punto è spesso una scelta perdente.</p></div>
              <div className="card"><h4>Se sei in panico</h4><p>Fai un esercizio facile o un passaggio tecnico. Il cervello riparte con azioni piccole. Non aspettare di &quot;sentirti pronto&quot;. Scrivi.</p></div>
            </div>
            <div className="success">
              <strong>Regola da verifica:</strong> devi massimizzare punti, non dimostrare di essere intelligente. Il voto non premia il dramma. Premia righe corrette, leggibili e complete.
            </div>
          </section>

          {/* 8 */}
          <section id="emergenza">
            <h2>8. Se hai solo 7 giorni: piano emergenza</h2>
            <p className="lead">Non è l&apos;ideale, ma si può ancora fare qualcosa. Però devi essere spietato: niente perfezionismo, niente programma completo, niente teoria infinita. Solo rendimento.</p>
            <div className="warning"><strong>Verità scomoda:</strong> in 7 giorni non recuperi mesi di caos. Puoi però aumentare molto le probabilità di strappare la sufficienza se scegli bene cosa studiare.</div>
            <h3>Giorno per giorno</h3>
            <div className="timeline">
              {[
                ["Giorno 1","Raccogli programma, verifiche vecchie, argomenti più probabili. Fai diagnosi con 6 esercizi."],
                ["Giorno 2","Fondamenta tecniche: calcoli, equazioni, segni, formule essenziali. Devi togliere gli errori più stupidi."],
                ["Giorno 3","Argomento più probabile numero 1. Fai solo esercizi base e medi fino a stabilizzarti."],
                ["Giorno 4","Argomento più probabile numero 2. Stessa logica: riconoscimento, procedura, errori."],
                ["Giorno 5","Esercizi misti. Devi allenarti a scegliere il metodo senza titolo dell'argomento."],
                ["Giorno 6","Simulazione completa. Correggi e crea la checklist personale degli errori."],
                ["Giorno 7","Ripasso leggero, formule, errori ricorrenti, sonno. Non distruggerti il cervello la sera prima."],
              ].map(([day, text]) => (
                <div className="day" key={day}><strong>{day}</strong><div>{text}</div></div>
              ))}
            </div>
            <h3>Cosa tagliare senza pietà</h3>
            <ul>
              <li>Teoria lunga che non sai trasformare in esercizi.</li>
              <li>Argomenti rarissimi se non hai ancora coperto quelli probabili.</li>
              <li>Esercizi troppo difficili che ti mangiano un&apos;ora e ti lasciano frustrato.</li>
              <li>Video infiniti guardati passivamente.</li>
            </ul>
            <h3>Cosa tenere</h3>
            <ul>
              <li>Esercizi tipo verifica.</li>
              <li>Errori corretti e rifatti.</li>
              <li>Formule essenziali con esempi.</li>
              <li>Simulazione con timer.</li>
            </ul>
          </section>

          {/* 9 */}
          <section id="template">
            <h2>9. Template pronti da copiare</h2>
            <p className="lead">La guida funziona solo se la trasformi in azione. Copia questi template su un quaderno o in un documento e usali ogni giorno.</p>
            <h3>Template 1 — Registro errori</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Data</th><th>Argomento</th><th>Errore preciso</th><th>Perché è successo</th><th>Regola personale</th><th>Rifatto?</th></tr></thead>
                <tbody>
                  <tr><td>__/__/__</td><td>Derivate</td><td>Ho derivato un prodotto come prodotto delle derivate.</td><td>Non ho riconosciuto la struttura f · g.</td><td>Se vedo due funzioni moltiplicate, uso f&apos; · g + f · g&apos;.</td><td>Sì / No</td></tr>
                  <tr><td>__/__/__</td><td>Dominio</td><td>Ho dimenticato il denominatore diverso da zero.</td><td>Mi sono concentrato solo sulla radice.</td><td>Prima lista tutti i vincoli, poi fai l&apos;intersezione.</td><td>Sì / No</td></tr>
                </tbody>
              </table>
            </div>
            <h3>Template 2 — Scheda argomento</h3>
            <div className="card">
              <p><strong>Argomento:</strong> ____________________________</p>
              <p><strong>Definizione utile in una frase:</strong> ____________________________</p>
              <p><strong>Quando lo riconosco:</strong> se nel testo vedo ____________________________</p>
              <p><strong>Primo passaggio:</strong> ____________________________</p>
              <p><strong>Procedura standard:</strong></p>
              <ol><li>____________________________</li><li>____________________________</li><li>____________________________</li></ol>
              <p><strong>Tre errori tipici:</strong></p>
              <ol><li>____________________________</li><li>____________________________</li><li>____________________________</li></ol>
              <p><strong>Esercizio campione da saper rifare:</strong> ____________________________</p>
            </div>
            <h3>Template 3 — Sessione da 75 minuti</h3>
            <div className="grid-3">
              <div className="card"><span className="mini-label">10 minuti</span><h4>Ripartenza</h4><p>Rivedi solo la scheda argomento e gli errori del giorno prima.</p></div>
              <div className="card"><span className="mini-label">40 minuti</span><h4>Esercizi</h4><p>Fai 3 base, 2 medi, 1 verifica. Timer attivo, soluzione chiusa.</p></div>
              <div className="card"><span className="mini-label">25 minuti</span><h4>Correzione</h4><p>Scrivi errori, rifai almeno un esercizio sbagliato, aggiorna checklist.</p></div>
            </div>
            <h3>Template 4 — Messaggio da mandare al prof</h3>
            <div className="callout">
              <p><strong>Versione seria:</strong></p>
              <p>&quot;Prof, sto preparando il recupero di matematica e vorrei lavorare in modo mirato. Potrebbe indicarmi gli argomenti più importanti e il tipo di esercizi su cui concentrarmi? Ho già iniziato a fare esercizi su ________, ma voglio capire meglio le priorità.&quot;</p>
            </div>
          </section>

          {/* Contratto finale */}
          <section>
            <h2>La pagina finale: il tuo contratto</h2>
            <p className="lead">Non firmare mentalmente questa guida se poi la tratti come un PDF da salvare e dimenticare. Il recupero non cambia perché hai letto. Cambia perché esegui.</p>
            <div className="checkbox-list">
              {["Ho fatto la diagnosi iniziale e so qual è il mio problema principale.","Ho scritto gli argomenti del debito in ordine di priorità.","Ho creato almeno una scheda argomento.","Ho iniziato il registro errori.","Ho programmato le prime 7 sessioni sul calendario.","Ho deciso quando fare la prima simulazione."].map(q => (
                <div className="check-item" key={q}><div className="box" /><div>{q}</div></div>
              ))}
            </div>
            <div className="quote">
              Il recupero non si vince il giorno della verifica. Si vince nei giorni in cui nessuno ti guarda e tu rifai l&apos;esercizio che ieri hai sbagliato.
              <small>Theoremz</small>
            </div>
          </section>

          {/* CTA footer */}
          <div className="footer-cta">
            <h2>Vuoi un piano preciso sui tuoi argomenti?</h2>
            <p>Ogni studente ha un problema diverso: basi, metodo, ansia da verifica, esercizi troppo difficili, mancanza di costanza. Il modo più veloce per recuperare è smettere di studiare a caso e costruire un piano sui tuoi errori reali.</p>
            <p>In una chiamata gratuita di 15 minuti capiamo insieme il tuo punto di partenza, gli argomenti prioritari e come strutturare le prossime settimane.</p>
            <a className="cta-button" href="/diagnosi-gratuita">
              Prenota la diagnosi gratuita →
            </a>
          </div>
        </div>
      </main>
    </>
  );
}

const guideCSS = `
  .guide-page {
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    line-height: 1.58;
    color: #132033;
  }

  .guide-page .page {
    max-width: 1120px;
    margin: 0 auto;
    padding: 28px 22px 80px;
  }

  .guide-pdf-fab {
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 100;
  }

  .guide-mobile-only {
    display: none;
  }

  .mobile-guide-gate {
    max-width: 420px;
    width: 100%;
    display: grid;
    gap: 16px;
  }

  .dark .guide-mobile-only {
    background: linear-gradient(180deg, #08111f 0%, #0b1324 100%);
  }

  .mobile-guide-intro {
    max-width: 420px;
    width: 100%;
    display: grid;
    gap: 8px;
    margin-bottom: 18px;
    text-align: center;
  }

  .mobile-guide-intro h1 {
    margin: 0;
    font-size: 2rem;
    line-height: 0.95;
    letter-spacing: -0.06em;
    color: #132033;
  }

  .mobile-guide-intro p {
    margin: 0;
    color: #4b5f78;
    font-size: 0.98rem;
    line-height: 1.5;
  }

  .dark .mobile-guide-intro h1 {
    color: #f8fbff;
  }

  .dark .mobile-guide-intro p {
    color: rgba(226, 235, 248, 0.8);
  }

  .mobile-guide-eyebrow {
    display: inline-flex;
    justify-content: center;
    align-self: center;
    padding: 7px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #4f7cff !important;
    background: #eef5ff;
    border: 1px solid #d8e6ff;
  }

  .dark .mobile-guide-eyebrow {
    color: #8ee7dc !important;
    background: rgba(22, 38, 69, 0.95);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .mobile-guide-form {
    display: grid;
    gap: 12px;
    padding: 16px;
    border: 1px solid #d8e4f3;
    border-radius: 22px;
    background: rgba(255,255,255,0.9);
    box-shadow: 0 20px 40px -28px rgba(15, 23, 42, 0.18);
  }

  .dark .mobile-guide-form {
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(10, 18, 33, 0.86);
    box-shadow: 0 24px 50px -32px rgba(0, 0, 0, 0.65);
  }

  .mobile-field {
    display: grid;
    gap: 6px;
  }

  .mobile-field span {
    font-size: 0.84rem;
    font-weight: 800;
    color: #20324a;
  }

  .dark .mobile-field span {
    color: rgba(240, 245, 255, 0.88);
  }

  .mobile-input {
    height: 46px;
    border-radius: 16px;
    border: 1px solid #cfddee;
    background: #f8fbff;
    padding: 0 14px;
    color: #132033;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  }

  .dark .mobile-input {
    border-color: rgba(148, 163, 184, 0.24);
    background: rgba(15, 23, 42, 0.96);
    color: #f8fbff;
  }

  .dark .mobile-input::placeholder {
    color: rgba(148, 163, 184, 0.78);
  }

  .mobile-input:focus {
    border-color: #4f7cff;
    background: #ffffff;
    box-shadow: 0 0 0 4px rgba(79, 124, 255, 0.12);
  }

  .dark .mobile-input:focus {
    border-color: #8ee7dc;
    background: rgba(15, 23, 42, 1);
    box-shadow: 0 0 0 4px rgba(71, 203, 186, 0.14);
  }

  .mobile-download-button {
    height: 48px;
    border: 0;
    border-radius: 16px;
    background: #d7dde8;
    color: #7b8797;
    font-weight: 900;
    font-size: 0.95rem;
    cursor: not-allowed;
    transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
  }

  .dark .mobile-download-button {
    background: rgba(148, 163, 184, 0.18);
    color: rgba(226, 232, 240, 0.55);
  }

  .mobile-download-button--ready {
    cursor: pointer;
    color: #ffffff;
    background: linear-gradient(135deg, #4f7cff, #30d5c8);
    box-shadow: 0 12px 30px rgba(79, 124, 255, 0.28);
  }

  .dark .mobile-download-button--ready {
    color: #07111f;
    background: linear-gradient(135deg, #8ee7dc, #7db7ff);
    box-shadow: 0 12px 30px rgba(142, 231, 220, 0.22);
  }

  .mobile-download-button--ready:hover {
    transform: translateY(-1px);
  }

  .mobile-guide-note {
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.45;
    color: #62738b;
    text-align: center;
  }

  .dark .mobile-guide-note {
    color: rgba(203, 213, 225, 0.72);
  }

  .mobile-guide-error {
    margin: 0;
    padding: 10px 12px;
    border-radius: 14px;
    background: #fff1f2;
    border: 1px solid #fecdd3;
    color: #9f1239;
    font-size: 0.82rem;
    line-height: 1.45;
  }

  .dark .mobile-guide-error {
    background: rgba(127, 29, 29, 0.22);
    border-color: rgba(244, 63, 94, 0.28);
    color: #fecdd3;
  }

  .guide-page .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: white;
    margin-bottom: 42px;
    background: radial-gradient(circle at top left, rgba(79,124,255,0.35), transparent 34rem),
      radial-gradient(circle at top right, rgba(48,213,200,0.28), transparent 32rem),
      linear-gradient(180deg, #07111f 0%, #0b1425 100%);
    padding: 24px 32px;
    border-radius: 28px;
  }

  .guide-page .brand-lockup { display:flex; gap:12px; align-items:center; font-weight:900; letter-spacing:-0.04em; font-size:1.28rem; }
  .guide-page .brand-mark { width:38px; height:38px; border-radius:13px; background:linear-gradient(135deg,#4f7cff,#30d5c8); display:grid; place-items:center; color:white; font-weight:950; }
  .guide-page .tag { font-size:0.82rem; color:rgba(255,255,255,0.78); border:1px solid rgba(255,255,255,0.16); padding:9px 13px; border-radius:999px; backdrop-filter:blur(12px); background:rgba(255,255,255,0.06); }

  .guide-page .hero { display:grid; grid-template-columns:1.1fr 0.9fr; gap:34px; align-items:stretch; color:white; margin-bottom:36px; }
  .guide-page .hero-card { border-radius:28px; padding:48px; background:linear-gradient(145deg,rgba(255,255,255,0.13),rgba(255,255,255,0.035)),linear-gradient(135deg,rgba(79,124,255,0.18),rgba(48,213,200,0.10)); border:1px solid rgba(255,255,255,0.18); box-shadow:0 40px 100px rgba(0,0,0,0.28); overflow:hidden; position:relative; background-color:#07111f; }
  .guide-page .hero-card h1 { font-size:clamp(3rem,8vw,6.8rem); line-height:0.86; letter-spacing:-0.09em; margin:0 0 22px; }
  .guide-page .eyebrow { display:inline-flex; align-items:center; gap:8px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:#30d5c8; font-size:0.78rem; margin-bottom:16px; }
  .guide-page .subtitle { font-size:clamp(1.12rem,2.3vw,1.42rem); color:rgba(255,255,255,0.82); max-width:680px; margin:0 0 30px; }
  .guide-page .hero-actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:28px; }
  .guide-page .pill { display:inline-flex; align-items:center; gap:8px; padding:11px 14px; border-radius:999px; background:rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.17); color:rgba(255,255,255,0.88); font-weight:700; font-size:0.91rem; }
  .guide-page .print-note { color:rgba(255,255,255,0.7); font-size:0.88rem; margin-top:18px; }

  .guide-page .side-card { border-radius:28px; padding:30px; background:#ffffff; color:#132033; box-shadow:0 22px 70px rgba(8,23,48,0.18); align-self:stretch; display:flex; flex-direction:column; justify-content:space-between; }
  .guide-page .score-box { padding:24px; border-radius:24px; background:linear-gradient(180deg,#edf5ff,#ffffff); border:1px solid #d8e4f3; margin-bottom:18px; }
  .guide-page .score-number { font-size:4.2rem; font-weight:950; letter-spacing:-0.09em; line-height:0.9; background:linear-gradient(135deg,#4f7cff,#30d5c8); -webkit-background-clip:text; color:transparent; background-clip:text; }
  .guide-page .side-card h2 { margin:0 0 10px; letter-spacing:-0.05em; font-size:1.8rem; }
  .guide-page .side-card p { margin:0; color:#5c6c83; }

  .guide-page .toc { background:white; border-radius:28px; box-shadow:0 22px 70px rgba(8,23,48,0.18); padding:34px; margin:34px 0; border:1px solid #d8e4f3; }
  .guide-page .toc h2, .guide-page section h2 { letter-spacing:-0.06em; font-size:clamp(1.9rem,4vw,3rem); line-height:1; margin:0 0 20px; }
  .guide-page .toc-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin-top:22px; }
  .guide-page .toc a { text-decoration:none; color:#132033; display:block; padding:16px; border:1px solid #d8e4f3; border-radius:17px; background:#fbfdff; font-weight:800; }
  .guide-page .toc a span { display:block; color:#4f7cff; font-size:0.78rem; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:4px; }

  .guide-page section { background:white; border:1px solid #d8e4f3; border-radius:28px; box-shadow:0 22px 70px rgba(8,23,48,0.18); padding:42px; margin:28px 0; overflow:hidden; position:relative; }
  .guide-page section:before { content:""; position:absolute; inset:0 0 auto; height:6px; background:linear-gradient(90deg,#4f7cff,#30d5c8,#ffd166); }
  .guide-page h3 { font-size:1.45rem; letter-spacing:-0.035em; margin:30px 0 10px; }
  .guide-page h4 { margin:20px 0 8px; font-size:1.08rem; }
  .guide-page p { margin:10px 0; }
  .guide-page .lead { font-size:1.16rem; color:#3b4a61; max-width:860px; }

  .guide-page .grid-2 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }
  .guide-page .grid-3 { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; }
  .guide-page .card { border:1px solid #d8e4f3; border-radius:20px; background:#fbfdff; padding:22px; }
  .guide-page .card.dark { background:linear-gradient(145deg,#0d1b30,#101e36); color:white; border-color:rgba(255,255,255,0.14); }
  .guide-page .card.dark p, .guide-page .card.dark li { color:rgba(255,255,255,0.8); }

  .guide-page .callout { border-radius:20px; padding:22px 24px; margin:24px 0; background:linear-gradient(135deg,rgba(79,124,255,0.10),rgba(48,213,200,0.10)); border:1px solid rgba(79,124,255,0.22); }
  .guide-page .warning { border-left:7px solid #ff5d6c; background:#fff5f6; border-radius:16px; padding:18px 20px; margin:22px 0; }
  .guide-page .success { border-left:7px solid #2cc36b; background:#f2fff7; border-radius:16px; padding:18px 20px; margin:22px 0; }
  .guide-page .mini-label { display:inline-block; font-size:0.72rem; letter-spacing:0.08em; text-transform:uppercase; font-weight:900; color:#4f7cff; margin-bottom:8px; }

  .guide-page ul, .guide-page ol { padding-left:1.3rem; }
  .guide-page li { margin:7px 0; }

  .guide-page .table-wrap { overflow-x:auto; margin:20px 0; border-radius:18px; border:1px solid #d8e4f3; }
  .guide-page table { width:100%; border-collapse:collapse; background:white; min-width:520px; }
  .guide-page th, .guide-page td { text-align:left; padding:14px 16px; border-bottom:1px solid #d8e4f3; vertical-align:top; }
  .guide-page th { background:#eef5ff; color:#18304f; font-size:0.83rem; letter-spacing:0.05em; text-transform:uppercase; }
  .guide-page tr:last-child td { border-bottom:0; }

  .guide-page .formula { font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; background:#f1f6ff; border:1px solid #d8e6ff; color:#18304f; padding:2px 7px; border-radius:8px; white-space:nowrap; }
  .guide-page .exercise { background:#fbfdff; border:1px solid #d8e4f3; border-radius:18px; padding:18px; margin:14px 0; }
  .guide-page .exercise strong { color:#18304f; }

  .guide-page .checkbox-list { display:grid; gap:10px; margin:18px 0; }
  .guide-page .check-item { display:grid; grid-template-columns:26px 1fr; gap:10px; align-items:start; padding:12px 14px; border:1px solid #d8e4f3; border-radius:14px; background:#fbfdff; }
  .guide-page .box { width:20px; height:20px; border:2px solid #9fb5d1; border-radius:5px; margin-top:2px; background:white; }

  .guide-page .stepper { counter-reset:step; display:grid; gap:14px; margin:22px 0; }
  .guide-page .step { counter-increment:step; display:grid; grid-template-columns:46px 1fr; gap:14px; align-items:start; padding:18px; border:1px solid #d8e4f3; border-radius:18px; background:#fbfdff; }
  .guide-page .step:before { content:counter(step); width:42px; height:42px; display:grid; place-items:center; border-radius:14px; background:linear-gradient(135deg,#4f7cff,#30d5c8); color:white; font-weight:950; }

  .guide-page .quote { font-size:1.45rem; line-height:1.25; letter-spacing:-0.04em; font-weight:850; margin:28px 0; padding:26px; border-radius:24px; color:white; background:linear-gradient(135deg,#0d1b30,#19355c); }
  .guide-page .quote small { display:block; color:rgba(255,255,255,0.68); margin-top:8px; font-size:0.86rem; letter-spacing:0; font-weight:650; }

  .guide-page .timeline { display:grid; gap:16px; margin-top:18px; }
  .guide-page .day { display:grid; grid-template-columns:95px 1fr; gap:18px; padding:18px; border:1px solid #d8e4f3; border-radius:18px; background:#fbfdff; }
  .guide-page .day strong { color:#4f7cff; }

  .guide-page .badge-row { display:flex; flex-wrap:wrap; gap:10px; margin:20px 0; }
  .guide-page .badge { display:inline-block; padding:8px 11px; border-radius:999px; background:#eef5ff; color:#18304f; font-weight:800; font-size:0.86rem; border:1px solid #d8e6ff; }

  .guide-page .footer-cta { background:linear-gradient(135deg,#07111f,#10233e); color:white; border-radius:28px; padding:44px; margin-top:30px; box-shadow:0 35px 90px rgba(0,0,0,0.25); position:relative; overflow:hidden; }
  .guide-page .footer-cta:after { content:""; position:absolute; right:-80px; bottom:-120px; width:330px; height:330px; background:radial-gradient(circle,rgba(48,213,200,0.32),transparent 68%); }
  .guide-page .footer-cta h2 { font-size:clamp(2rem,5vw,4rem); line-height:0.95; letter-spacing:-0.08em; margin:0 0 16px; position:relative; z-index:1; }
  .guide-page .footer-cta p { position:relative; z-index:1; color:rgba(255,255,255,0.82); max-width:800px; }
  .guide-page .cta-button { display:inline-block; margin-top:20px; padding:16px 28px; border-radius:999px; background:linear-gradient(135deg,#4f7cff,#30d5c8); color:white; text-decoration:none; font-weight:900; font-size:1.05rem; position:relative; z-index:1; box-shadow:0 14px 40px rgba(79,124,255,0.35); }
  .guide-page .cta-button:hover { opacity:0.92; }

  @media (max-width: 880px) {
    .guide-desktop-only {
      display: none;
    }

    .guide-mobile-only {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      flex-direction: column;
      min-height: 100dvh;
      padding: 8px 18px 18px;
      background: linear-gradient(180deg, #f7fbff 0%, #ffffff 100%);
    }

    .guide-pdf-fab {
      display: none;
    }

    .guide-page .hero, .guide-page .grid-2, .guide-page .grid-3, .guide-page .toc-grid { grid-template-columns:1fr; }
    .guide-page .hero-card, .guide-page section, .guide-page .toc, .guide-page .footer-cta { padding:28px; }
    .guide-page .day { grid-template-columns:1fr; }
  }

  @media print {
    .guide-pdf-fab, .no-print { display:none !important; }
    .guide-page .page { max-width:100%; padding:0; }
    .guide-page section, .guide-page .toc { box-shadow:none; page-break-inside:avoid; }
    .guide-page .hero-card, .guide-page .footer-cta { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
  }
`;
