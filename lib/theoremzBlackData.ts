// lib/theoremzBlackData.ts
// Dati di Theoremz Black estratti dalla pagina /black

export const THEOREMZ_BLACK_DATA = {
  title: "Theoremz Black",
  description: "Assistenza via chat, esercizi illimitati e videolezioni",
  slogan: "Studia la matematica in modo semplice",

  whatIsIt: {
    summary:
      "Theoremz Black ti offre un modo nuovo di studiare: ogni giorno, un insegnante ti segue via chat e ti aiuta a capire ogni argomento passo dopo passo.",
    features: [
      "Supporto personale tramite tutor via chat",
      "Accesso a tutte le risorse di Theoremz: esercizi spiegati, quiz, appunti e videolezioni",
      "Tutto in un solo posto per studiare meglio, con costanza e sicurezza",
    ],
  },

  includes: {
    "Assistenza Costante via Chat": [
      "Supporto Giornaliero: Lo studente ha sempre a disposizione un insegnante a cui porre domande o chiedere materiale aggiuntivo",
      "Aiuto compiti: In caso di difficoltà con gli esercizi, lo studente viene seguito passo passo nella risoluzione",
    ],
    "Tutti gli Esercizi che vuoi": [
      "Catalogo Illimitato di Esercizi: Accesso a centinaia di esercizi già presenti; è possibile richiederne ulteriori se non bastassero",
      "Già Risolti e Spiegati: Spiegazioni passo passo, con immagini; possibilità di rispiegazione privata su richiesta",
    ],
    "Appunti, Formulari e Lezioni": [
      "Tutti gli argomenti coperti: Formulario e videolezione per ogni argomento + molti appunti in PDF",
      "Mai senza materiale: Si può richiedere materiale aggiuntivo in ogni momento",
    ],
    "Bonus e Premi per gli Iscritti": [
      "Sempre al primo posto: Accesso prioritario alle nuove funzionalità e alle offerte esclusive",
      "La tua opinione conta: Puoi richiedere funzionalità o argomenti non ancora presenti sul sito",
    ],
  },

  quickFeatures: [
    "Tutor via chat ogni giorno",
    "Esercizi pronti e spiegati passo passo",
    "Accesso immediato a tutte le risorse",
  ],

  pricing: {
    essential: {
      price: "5.90",
      currency: "EUR",
      period: "mese",
      paymentLink: "https://buy.stripe.com/14A3cv1Wc0jZdrX0iWc7u0P",
    },
    standard: {
      price: "14.90",
      originalPrice: "19.90",
      currency: "EUR",
      period: "mese",
      paymentLink: "https://buy.stripe.com/8x214ndEU7MrafL0iWc7u0Q",
      discount: {
        expires: "2025-11-15T23:59:59+01:00",
        percent: 25,
        active: true
      }
    },
    yearly: {
      price: "199.00",
      currency: "EUR",
      period: "anno",
    },
  },

  ratings: {
    score: "4.8",
    outOf: "5",
    totalStudents: "Oltre 200 studenti soddisfatti",
  },

  benefits: [
    "Modo nuovo di studiare con supporto personalizzato",
    "Insegnante disponibile ogni giorno via chat",
    "Accesso completo a esercizi, quiz, appunti e videolezioni",
    "Catalogo illimitato di esercizi con spiegazioni dettagliate",
    "Materiale sempre aggiornato e personalizzabile",
    "Accesso prioritario a nuove funzionalità",
  ],
};

export function getTheoremzBlackInfo(): string {
  const data = THEOREMZ_BLACK_DATA;

  // Calcolo timer e sconto per il piano standard
  const now = new Date();
  const discount = data.pricing.standard.discount;
  let discountInfo = "";
  if (discount && discount.active) {
    const expires = new Date(discount.expires);
    if (now < expires) {
      const percent = Math.round(
        (1 - parseFloat(data.pricing.standard.price) / parseFloat(data.pricing.standard.originalPrice)) * 100
      );
      const timeLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      discountInfo = `\n• Sconto ${percent}% valido fino al ${expires.toLocaleDateString()} (${timeLeft} giorni rimanenti)`;
    }
  }

  return `
**Theoremz Black** è ${data.slogan.toLowerCase()}.

**Cosa include:**
${Object.entries(data.includes)
  .map(([category, items]) => `• **${category}**: ${items.join("; ")}`)
  .join("\n")}

**Caratteristiche principali:**
${data.quickFeatures.map((feature) => `• ${feature}`).join("\n")}

**Prezzi:**
• Piano Essential: €${data.pricing.essential.price}/${data.pricing.essential.period} [Pagamento](${data.pricing.essential.paymentLink})
• Piano Black Standard: ~~€${data.pricing.standard.originalPrice}~~ **€${data.pricing.standard.price}**/${data.pricing.standard.period} [Pagamento](${data.pricing.standard.paymentLink})${discountInfo}
• Piano annuale: €${data.pricing.yearly.price}/${data.pricing.yearly.period}

**Valutazioni:** ${data.ratings.score}/${data.ratings.outOf} - ${data.ratings.totalStudents}

${data.whatIsIt.summary}
  `.trim();
}
