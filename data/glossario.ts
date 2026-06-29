export interface GlossaryTerm {
  termine: string;
  slug: string;
  categoria: string;
  materia: "matematica" | "fisica";
  definizione: string;
  lezione?: string;
}

export const CATEGORIE = [
  "Algebra",
  "Analisi",
  "Trigonometria",
  "Geometria",
  "Probabilità e statistica",
  "Fisica",
] as const;

export const glossario: GlossaryTerm[] = [
  // ── ALGEBRA ────────────────────────────────────────────────────────────────
  {
    termine: "Equazione",
    slug: "equazione",
    categoria: "Algebra",
    materia: "matematica",
    definizione:
      "Uguaglianza tra due espressioni contenente una o più incognite. Risolvere un'equazione significa trovare i valori dell'incognita che rendono l'uguaglianza vera. Le soluzioni formano l'insieme soluzione.",
    lezione: "equazioni-di-primo-grado",
  },
  {
    termine: "Disequazione",
    slug: "disequazione",
    categoria: "Algebra",
    materia: "matematica",
    definizione:
      "Disuguaglianza che coinvolge una o più incognite. La soluzione non è un valore singolo ma un insieme di valori (intervallo) che soddisfano la disuguaglianza. Si risolve con regole simili alle equazioni, con attenzione al verso quando si moltiplica per un negativo.",
    lezione: "disequazioni-lineari",
  },
  {
    termine: "Discriminante",
    slug: "discriminante",
    categoria: "Algebra",
    materia: "matematica",
    definizione:
      "Espressione Δ = b² − 4ac dell'equazione di secondo grado ax² + bx + c = 0. Se Δ > 0 ci sono due soluzioni reali distinte; se Δ = 0 una soluzione doppia; se Δ < 0 nessuna soluzione reale.",
    lezione: "equazioni-di-secondo-grado",
  },
  {
    termine: "Fattorizzazione",
    slug: "fattorizzazione",
    categoria: "Algebra",
    materia: "matematica",
    definizione:
      "Scomposizione di un polinomio come prodotto di fattori di grado inferiore. Tecniche principali: raccoglimento a fattor comune, prodotti notevoli (quadrato di binomio, differenza di quadrati), formula di Ruffini per trovare radici razionali.",
    lezione: "scomposizione-polinomi",
  },
  {
    termine: "Monomio",
    slug: "monomio",
    categoria: "Algebra",
    materia: "matematica",
    definizione:
      "Espressione algebrica composta da un coefficiente numerico moltiplicato per variabili elevate a potenza intera non negativa (es. 3x²y). Il grado è la somma degli esponenti delle variabili. Due monomi sono simili se hanno la stessa parte letterale.",
    lezione: "calcolo-letterale",
  },
  {
    termine: "Polinomio",
    slug: "polinomio",
    categoria: "Algebra",
    materia: "matematica",
    definizione:
      "Somma di monomi. Il grado è l'esponente più alto presente. Le operazioni tra polinomi (addizione, moltiplicazione, divisione) seguono regole analoghe a quelle tra numeri. Fondamentale per lo studio di equazioni, funzioni e geometria analitica.",
    lezione: "calcolo-letterale",
  },
  {
    termine: "Progressione aritmetica",
    slug: "progressione-aritmetica",
    categoria: "Algebra",
    materia: "matematica",
    definizione:
      "Successione in cui ogni termine si ottiene sommando al precedente una costante chiamata ragione d. Il termine n-esimo è aₙ = a₁ + (n−1)d. La somma dei primi n termini vale Sₙ = n(a₁ + aₙ)/2.",
    lezione: "progressioni-aritmetiche",
  },
  {
    termine: "Progressione geometrica",
    slug: "progressione-geometrica",
    categoria: "Algebra",
    materia: "matematica",
    definizione:
      "Successione in cui ogni termine si ottiene moltiplicando il precedente per una costante chiamata ragione q. Il termine n-esimo è aₙ = a₁ · qⁿ⁻¹. Se |q| < 1 la serie geometrica infinita converge a a₁/(1 − q).",
    lezione: "progressioni-geometriche",
  },
  {
    termine: "Logaritmo",
    slug: "logaritmo",
    categoria: "Algebra",
    materia: "matematica",
    definizione:
      "logₐb è l'esponente a cui bisogna elevare la base a per ottenere b. Proprietà principali: logₐ(xy) = logₐx + logₐy; logₐ(x/y) = logₐx − logₐy; logₐ(xⁿ) = n·logₐx. Il logaritmo naturale usa base e ≈ 2,718.",
    lezione: "logaritmi-e-le-loro-propriet",
  },
  {
    termine: "Valore assoluto",
    slug: "valore-assoluto",
    categoria: "Algebra",
    materia: "matematica",
    definizione:
      "Il valore assoluto |x| di un numero reale è x se x ≥ 0, e −x se x < 0. Geometricamente rappresenta la distanza di x dall'origine sulla retta numerica. Fondamentale per equazioni e disequazioni con il modulo.",
    lezione: "disequazioni-con-valore-assoluto",
  },

  // ── ANALISI ────────────────────────────────────────────────────────────────
  {
    termine: "Funzione",
    slug: "funzione",
    categoria: "Analisi",
    materia: "matematica",
    definizione:
      "Regola che associa a ogni elemento del dominio esattamente un elemento del codominio. Si scrive f: A → B. Non è una funzione se a un input corrispondono più output. Può essere rappresentata algebricamente, graficamente o tramite una tabella.",
    lezione: "funzioni",
  },
  {
    termine: "Dominio",
    slug: "dominio",
    categoria: "Analisi",
    materia: "matematica",
    definizione:
      "Insieme di tutti i valori di input per cui una funzione è definita. Si determina escludendo i valori che rendono l'espressione impossibile: denominatore nullo per le frazioni, radicando negativo per le radici pari, argomento non positivo per i logaritmi.",
    lezione: "dominio-di-una-funzione",
  },
  {
    termine: "Limite",
    slug: "limite",
    categoria: "Analisi",
    materia: "matematica",
    definizione:
      "Valore L a cui si avvicina f(x) quando x tende a un punto c (o all'infinito), indipendentemente dal valore effettivo in c. Si scrive lim f(x) = L. Strumento fondamentale per definire continuità, derivata e integrale.",
    lezione: "limite-di-una-funzione",
  },
  {
    termine: "Continuità",
    slug: "continuita",
    categoria: "Analisi",
    materia: "matematica",
    definizione:
      "Una funzione è continua in un punto x₀ se il limite per x→x₀ esiste, coincide col valore f(x₀) e quest'ultimo è definito. Intuitivamente: il grafico si può disegnare senza staccare la matita. Le discontinuità si classificano in tre specie.",
    lezione: "continuita-e-discontinuita",
  },
  {
    termine: "Derivata",
    slug: "derivata",
    categoria: "Analisi",
    materia: "matematica",
    definizione:
      "Misura la variazione istantanea di una funzione in un punto. Geometricamente è la pendenza della retta tangente al grafico. Si calcola come limite del rapporto incrementale: f'(x) = lim [f(x+h)−f(x)]/h per h→0.",
    lezione: "derivate",
  },
  {
    termine: "Derivata seconda",
    slug: "derivata-seconda",
    categoria: "Analisi",
    materia: "matematica",
    definizione:
      "Derivata della funzione derivata f'. Fornisce informazioni sulla concavità del grafico: se f'' > 0 la funzione è convessa (concava verso l'alto), se f'' < 0 è concava (concava verso il basso). Utile per classificare i punti stazionari.",
    lezione: "concavita-e-flessi",
  },
  {
    termine: "Punto stazionario",
    slug: "punto-stazionario",
    categoria: "Analisi",
    materia: "matematica",
    definizione:
      "Punto in cui la derivata prima si annulla (f'(x₀) = 0). Può essere un massimo relativo (f' cambia da + a −), un minimo relativo (f' cambia da − a +) oppure un flesso a tangente orizzontale (f' non cambia segno).",
    lezione: "massimi-e-minimi",
  },
  {
    termine: "Punto di flesso",
    slug: "punto-di-flesso",
    categoria: "Analisi",
    materia: "matematica",
    definizione:
      "Punto del grafico in cui la funzione cambia concavità, cioè f'' cambia segno. Se la tangente è orizzontale si parla di flesso a tangente orizzontale (f' = 0 e f'' = 0). Il flesso non è né un massimo né un minimo.",
    lezione: "concavita-e-flessi",
  },
  {
    termine: "Asintoto",
    slug: "asintoto",
    categoria: "Analisi",
    materia: "matematica",
    definizione:
      "Retta a cui il grafico di una funzione si avvicina indefinitamente. Tre tipi: verticale (x = a, dove f → ±∞), orizzontale (y = L per x → ±∞) e obliquo (y = mx + q, quando il limite del rapporto f(x)/x è finito e non nullo).",
    lezione: "asintoti",
  },
  {
    termine: "Integrale indefinito",
    slug: "integrale-indefinito",
    categoria: "Analisi",
    materia: "matematica",
    definizione:
      "Operazione inversa della derivata: trovare tutte le funzioni F (primitive) tali che F' = f. Il risultato include una costante arbitraria C. Si scrive ∫f(x)dx = F(x) + C. Le regole base (potenze, esponenziali, trigonometriche) vanno memorizzate.",
    lezione: "integrali-indefiniti",
  },
  {
    termine: "Integrale definito",
    slug: "integrale-definito",
    categoria: "Analisi",
    materia: "matematica",
    definizione:
      "Area con segno compresa tra il grafico di f e l'asse x nell'intervallo [a, b]. Si calcola con il teorema fondamentale del calcolo: ∫ₐᵇ f(x)dx = F(b) − F(a). Positivo se f > 0, negativo se f < 0, nell'intervallo considerato.",
    lezione: "area-sottesa-integrali",
  },
  {
    termine: "Primitiva",
    slug: "primitiva",
    categoria: "Analisi",
    materia: "matematica",
    definizione:
      "Funzione F tale che la sua derivata è f, cioè F'(x) = f(x). Ogni funzione continua ha infinite primitive, che differiscono per una costante additiva C. Trovare una primitiva equivale a calcolare l'integrale indefinito di f.",
    lezione: "integrali-indefiniti",
  },
  {
    termine: "Studio di funzione",
    slug: "studio-di-funzione",
    categoria: "Analisi",
    materia: "matematica",
    definizione:
      "Procedura sistematica per analizzare e tracciare il grafico di una funzione. Passi: dominio, simmetrie, segno, limiti e asintoti, derivata prima (crescenza e punti stazionari), derivata seconda (concavità e flessi), grafico.",
    lezione: "studio-di-funzione",
  },

  // ── TRIGONOMETRIA ──────────────────────────────────────────────────────────
  {
    termine: "Seno",
    slug: "seno",
    categoria: "Trigonometria",
    materia: "matematica",
    definizione:
      "In un triangolo rettangolo: rapporto tra il cateto opposto all'angolo e l'ipotenusa. Sulla circonferenza goniometrica (raggio 1): ordinata del punto corrispondente all'angolo. Varia tra −1 e 1; sin(0°) = 0, sin(90°) = 1.",
    lezione: "funzioni-goniometriche",
  },
  {
    termine: "Coseno",
    slug: "coseno",
    categoria: "Trigonometria",
    materia: "matematica",
    definizione:
      "In un triangolo rettangolo: rapporto tra il cateto adiacente e l'ipotenusa. Sulla circonferenza goniometrica: ascissa del punto corrispondente all'angolo. Identità fondamentale: sin²x + cos²x = 1. Varia tra −1 e 1.",
    lezione: "funzioni-goniometriche",
  },
  {
    termine: "Tangente",
    slug: "tangente",
    categoria: "Trigonometria",
    materia: "matematica",
    definizione:
      "Rapporto sinx/cosx. In un triangolo rettangolo: cateto opposto su cateto adiacente. Non è definita per x = 90° + k·180°. La funzione tangente è periodica di periodo π e assume tutti i valori reali.",
    lezione: "funzioni-goniometriche",
  },
  {
    termine: "Radiante",
    slug: "radiante",
    categoria: "Trigonometria",
    materia: "matematica",
    definizione:
      "Unità di misura degli angoli del Sistema Internazionale. Un radiante è l'angolo al centro che sottende un arco lungo quanto il raggio. Conversione: rad = gradi × π/180. Un angolo piatto (180°) vale π rad; un angolo retto (90°) vale π/2 rad.",
    lezione: "circonferenza-goniometrica",
  },
  {
    termine: "Identità trigonometrica fondamentale",
    slug: "identita-trigonometrica",
    categoria: "Trigonometria",
    materia: "matematica",
    definizione:
      "Relazione sin²x + cos²x = 1 valida per ogni angolo x. Deriva direttamente dal teorema di Pitagora applicato alla circonferenza goniometrica unitaria. Da essa si ricavano anche 1 + tan²x = 1/cos²x e 1 + cot²x = 1/sin²x.",
    lezione: "funzioni-goniometriche",
  },
  {
    termine: "Formule di duplicazione",
    slug: "formule-di-duplicazione",
    categoria: "Trigonometria",
    materia: "matematica",
    definizione:
      "Esprimono sin(2α), cos(2α) e tan(2α) in termini di sin α e cos α. Le formule principali: sin(2α) = 2·sinα·cosα; cos(2α) = cos²α − sin²α = 2cos²α − 1 = 1 − 2sin²α. Si ricavano dalle formule di addizione.",
    lezione: "formule-di-duplicazione",
  },

  // ── GEOMETRIA ──────────────────────────────────────────────────────────────
  {
    termine: "Teorema di Pitagora",
    slug: "teorema-di-pitagora",
    categoria: "Geometria",
    materia: "matematica",
    definizione:
      "In ogni triangolo rettangolo, il quadrato dell'ipotenusa è uguale alla somma dei quadrati dei cateti: c² = a² + b². Vale esclusivamente per i triangoli rettangoli. È uno dei teoremi più usati in geometria, trigonometria e fisica.",
    lezione: "teorema-di-pitagora-e-i-due-teoremi-di-euclide",
  },
  {
    termine: "Vettore",
    slug: "vettore",
    categoria: "Geometria",
    materia: "matematica",
    definizione:
      "Ente geometrico caratterizzato da modulo (lunghezza), direzione (retta di appartenenza) e verso (freccia). Due vettori sono uguali se hanno stessi modulo, direzione e verso. Le operazioni principali sono somma (regola del parallelogramma) e prodotto per uno scalare.",
    lezione: "vettori",
  },
  {
    termine: "Piano cartesiano",
    slug: "piano-cartesiano",
    categoria: "Geometria",
    materia: "matematica",
    definizione:
      "Sistema di riferimento formato da due rette perpendicolari (assi x e y) che si intersecano nell'origine O. Ogni punto è identificato dalla coppia ordinata (x, y). Introdotto da René Descartes, unisce algebra e geometria.",
    lezione: "piano-cartesiano",
  },
  {
    termine: "Retta",
    slug: "retta",
    categoria: "Geometria",
    materia: "matematica",
    definizione:
      "In geometria analitica: insieme dei punti (x, y) che soddisfano y = mx + q, dove m è il coefficiente angolare (pendenza) e q è l'intercetta sull'asse y. Due rette sono parallele se hanno lo stesso m, perpendicolari se m₁·m₂ = −1.",
    lezione: "rette",
  },
  {
    termine: "Parabola",
    slug: "parabola",
    categoria: "Geometria",
    materia: "matematica",
    definizione:
      "Curva geometrica luogo dei punti equidistanti da un fuoco e da una retta (direttrice). In geometria analitica è il grafico di y = ax² + bx + c. La concavità è verso l'alto se a > 0, verso il basso se a < 0. Il vertice si trova in x = −b/(2a).",
    lezione: "parabola",
  },
  {
    termine: "Circonferenza",
    slug: "circonferenza",
    categoria: "Geometria",
    materia: "matematica",
    definizione:
      "Luogo dei punti del piano equidistanti da un punto fisso detto centro. L'equazione è (x − a)² + (y − b)² = r², dove (a, b) è il centro e r il raggio. Da non confondere con il cerchio, che è l'area delimitata dalla circonferenza.",
    lezione: "cerchio-e-circonferenza",
  },
  {
    termine: "Sezione aurea",
    slug: "sezione-aurea",
    categoria: "Geometria",
    materia: "matematica",
    definizione:
      "Divisione di un segmento tale che il rapporto tra il tutto e la parte maggiore eguaglia il rapporto tra la parte maggiore e la minore. Il valore φ = (1+√5)/2 ≈ 1,618 soddisfa φ² = φ + 1. Ricorre nella natura, nell'arte e nella successione di Fibonacci.",
    lezione: "sezione-aurea",
  },
  {
    termine: "Apotema",
    slug: "apotema",
    categoria: "Geometria",
    materia: "matematica",
    definizione:
      "Nei poligoni regolari: distanza dal centro al punto medio di un lato (raggio del cerchio inscritto). Nei coni e nelle piramidi regolari: altezza della faccia laterale triangolare. Indispensabile per calcolare l'area laterale e totale di queste figure.",
    lezione: "poligoni-regolari",
  },

  // ── PROBABILITÀ E STATISTICA ───────────────────────────────────────────────
  {
    termine: "Probabilità",
    slug: "probabilita",
    categoria: "Probabilità e statistica",
    materia: "matematica",
    definizione:
      "Misura numerica compresa tra 0 e 1 della possibilità che un evento si verifichi. P = 0 significa impossibile, P = 1 certo. Definizione classica: numero di casi favorevoli diviso il numero di casi possibili (equiprobabili).",
    lezione: "probabilit",
  },
  {
    termine: "Probabilità condizionata",
    slug: "probabilita-condizionata",
    categoria: "Probabilità e statistica",
    materia: "matematica",
    definizione:
      "Probabilità che un evento A si verifichi sapendo che B è già accaduto. Formula: P(A|B) = P(A∩B) / P(B). Due eventi sono indipendenti se P(A|B) = P(A), cioè il verificarsi di B non modifica la probabilità di A.",
    lezione: "probabilita-condizionata",
  },
  {
    termine: "Media aritmetica",
    slug: "media-aritmetica",
    categoria: "Probabilità e statistica",
    materia: "matematica",
    definizione:
      "Valore medio di un insieme di dati: somma di tutti i valori divisa per il numero di dati. È l'indice di posizione centrale più usato. Sensibile ai valori anomali (outlier); in quel caso la mediana è più rappresentativa.",
    lezione: "statistica",
  },
  {
    termine: "Deviazione standard",
    slug: "deviazione-standard",
    categoria: "Probabilità e statistica",
    materia: "matematica",
    definizione:
      "Misura la dispersione dei dati attorno alla media. È la radice quadrata della varianza: σ = √[Σ(xᵢ − x̄)²/n]. Un valore basso indica dati concentrati attorno alla media; un valore alto indica dati molto dispersi.",
    lezione: "deviazione-standard-e-varianza",
  },
  {
    termine: "Variabile aleatoria",
    slug: "variabile-aleatoria",
    categoria: "Probabilità e statistica",
    materia: "matematica",
    definizione:
      "Variabile che assume valori numerici in base all'esito di un esperimento casuale. Può essere discreta (valori isolati, es. numero di teste in 5 lanci) o continua (valori in un intervallo, es. altezza di una persona). È descritta dalla sua distribuzione di probabilità.",
    lezione: "variabili-aleatorie",
  },
  {
    termine: "Coefficiente binomiale",
    slug: "coefficiente-binomiale",
    categoria: "Probabilità e statistica",
    materia: "matematica",
    definizione:
      "C(n, k) = n! / (k!(n−k)!) conta il numero di modi di scegliere k oggetti da n senza considerare l'ordine. Si legge «n su k». Appare nel triangolo di Tartaglia e nello sviluppo del binomio di Newton (a+b)ⁿ.",
    lezione: "calcolo-combinatorio",
  },

  // ── FISICA ─────────────────────────────────────────────────────────────────
  {
    termine: "Forza",
    slug: "forza",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Interazione vettoriale tra corpi che può modificarne il moto o deformarli. Si misura in newton (N). Il secondo principio della dinamica lega forza, massa e accelerazione: F = ma. Le forze si sommano vettorialmente.",
    lezione: "i-tre-principi-della-dinamica",
  },
  {
    termine: "Massa",
    slug: "massa",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Misura della quantità di materia di un corpo e della sua resistenza all'accelerazione (inerzia). Grandezza scalare, misurata in kilogrammi (kg). Da non confondere con il peso, che è una forza (P = mg) e dipende dall'accelerazione gravitazionale locale.",
    lezione: "i-tre-principi-della-dinamica",
  },
  {
    termine: "Velocità",
    slug: "velocita",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Grandezza vettoriale che descrive la variazione di posizione nel tempo: v = Δs/Δt. Si misura in m/s. La velocità scalare (modulo) è diversa dalla rapidità media. Nel moto rettilineo uniforme la velocità è costante.",
    lezione: "velocita-e-accelerazione",
  },
  {
    termine: "Accelerazione",
    slug: "accelerazione",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Variazione di velocità nel tempo: a = Δv/Δt. Grandezza vettoriale, misurata in m/s². Un'accelerazione non nulla indica che la velocità cambia in modulo, direzione o verso. Nell'accelerazione gravitazionale g ≈ 9,81 m/s² verso il basso.",
    lezione: "velocita-e-accelerazione",
  },
  {
    termine: "Lavoro",
    slug: "lavoro",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Prodotto scalare tra forza e spostamento: L = F·s·cosθ, dove θ è l'angolo tra i vettori. Si misura in joule (J = N·m). Il lavoro è positivo se la forza ha componente nella direzione del moto (lavoro motore), negativo se contraria (lavoro resistente).",
    lezione: "lavoro",
  },
  {
    termine: "Energia cinetica",
    slug: "energia-cinetica",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Energia posseduta da un corpo in movimento: Eₖ = ½mv². Si misura in joule. Il teorema dell'energia cinetica afferma che il lavoro totale compiuto su un corpo è uguale alla variazione della sua energia cinetica: L_tot = ΔEₖ.",
    lezione: "energia-cinetica",
  },
  {
    termine: "Energia potenziale",
    slug: "energia-potenziale",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Energia associata alla posizione di un corpo in un campo di forze conservative. Gravitazionale: U = mgh (con h l'altezza rispetto al riferimento). Elastica: U = ½kx² (con x l'allungamento della molla). Si misura in joule.",
    lezione: "energia-potenziale",
  },
  {
    termine: "Conservazione dell'energia",
    slug: "conservazione-energia",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "In un sistema isolato con sole forze conservative, l'energia meccanica totale E = Eₖ + U rimane costante. In presenza di forze dissipative (attrito), parte dell'energia meccanica si converte in calore. L'energia totale dell'universo si conserva sempre.",
    lezione: "energia-meccanica",
  },
  {
    termine: "Potenza",
    slug: "potenza-fisica",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Lavoro compiuto nell'unità di tempo: P = L/t. Forma equivalente: P = F·v (forza per velocità). Si misura in watt (W = J/s). La potenza descrive la rapidità con cui viene trasferita o trasformata energia.",
    lezione: "potenza",
  },
  {
    termine: "Forza di attrito",
    slug: "forza-di-attrito",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Forza che si oppone al moto relativo tra superfici a contatto: Fₐ = μN, dove μ è il coefficiente di attrito e N la forza normale. L'attrito statico impedisce l'inizio del moto (μₛ > μₐ); l'attrito dinamico agisce durante il moto.",
    lezione: "forza-di-attrito",
  },
  {
    termine: "Campo elettrico",
    slug: "campo-elettrico",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Regione dello spazio in cui una carica elettrica risente di una forza. Definito come E = F/q (forza per unità di carica), si misura in V/m. Le linee di campo partono dalle cariche positive e arrivano alle negative. Generato da cariche e da campi magnetici variabili.",
    lezione: "campo-elettrico",
  },
  {
    termine: "Potenziale elettrico",
    slug: "potenziale-elettrico",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Energia potenziale elettrica per unità di carica: V = U/q. Si misura in volt (V = J/C). La differenza di potenziale (tensione) tra due punti determina il lavoro compiuto per spostare una carica: L = q·ΔV. Le superfici equipotenziali sono perpendicolari alle linee di campo.",
    lezione: "potenziale-elettrico",
  },
  {
    termine: "Corrente elettrica",
    slug: "corrente-elettrica",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Flusso ordinato di cariche elettriche attraverso un conduttore: I = ΔQ/Δt. Si misura in ampere (A). Convenzionalmente scorre dal polo positivo a quello negativo. La legge di Ohm lega corrente, tensione e resistenza: V = RI.",
    lezione: "corrente-elettrica",
  },
  {
    termine: "Resistenza elettrica",
    slug: "resistenza-elettrica",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Grandezza che misura l'opposizione di un conduttore al flusso di corrente. Prima legge di Ohm: R = V/I. Si misura in ohm (Ω). Dipende dal materiale, dalla lunghezza e dalla sezione del conduttore (seconda legge di Ohm).",
    lezione: "leggi-di-ohm",
  },
  {
    termine: "Campo magnetico",
    slug: "campo-magnetico",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Regione dello spazio in cui cariche in moto e magneti risentono di una forza. Si misura in tesla (T). Le linee di campo formano curve chiuse che escono dal polo nord e rientrano nel polo sud. Generato da correnti elettriche e da campi elettrici variabili.",
    lezione: "campo-magnetico",
  },
  {
    termine: "Forza di Lorentz",
    slug: "forza-di-lorentz",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Forza su una carica q in moto con velocità v in un campo magnetico B: F = qvBsinα. È sempre perpendicolare alla velocità, quindi non compie lavoro e non modifica la velocità in modulo. Una carica in campo magnetico uniforme descrive un moto circolare.",
    lezione: "forza-di-lorentz",
  },
  {
    termine: "Induzione elettromagnetica",
    slug: "induzione-elettromagnetica",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Fenomeno per cui una variazione del flusso magnetico attraverso un circuito genera una forza elettromotrice indotta. Legge di Faraday-Neumann: fem = −ΔΦ/Δt. La legge di Lenz stabilisce che la corrente indotta si oppone alla variazione che la causa.",
    lezione: "induzione-elettromagnetica",
  },
  {
    termine: "Entropia",
    slug: "entropia",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Grandezza termodinamica che misura il grado di disordine di un sistema. Il secondo principio della termodinamica afferma che l'entropia totale di un sistema isolato non diminuisce mai: aumenta nei processi irreversibili e rimane costante in quelli reversibili.",
    lezione: "entropia",
  },
  {
    termine: "Onda",
    slug: "onda",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Perturbazione che si propaga trasportando energia senza trasporto netto di materia. Caratterizzata da lunghezza d'onda λ, frequenza f, periodo T = 1/f e velocità di propagazione v = λf. Le onde possono essere meccaniche (suono) o elettromagnetiche (luce).",
    lezione: "onde",
  },
  {
    termine: "Pressione",
    slug: "pressione",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Forza esercitata perpendicolarmente a una superficie per unità di area: p = F/S. Si misura in pascal (Pa = N/m²). Nei fluidi si trasmette in tutte le direzioni (principio di Pascal). La pressione idrostatica aumenta con la profondità (legge di Stevino).",
    lezione: "pressione",
  },
  {
    termine: "Densità",
    slug: "densita",
    categoria: "Fisica",
    materia: "fisica",
    definizione:
      "Massa per unità di volume: ρ = m/V. Si misura in kg/m³ (o g/cm³). Grandezza intensiva: non dipende dalla quantità di sostanza. La densità dell'acqua è 1000 kg/m³. Determina il galleggiamento: un corpo affonda se è più denso del fluido.",
    lezione: "densita",
  },
];
