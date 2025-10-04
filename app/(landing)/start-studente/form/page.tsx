import QuizClient from "./QuizClient";

export const metadata = {
  title: "Quiz studente — Trova il tuo percorso Theoremz",
  description:
    "Rispondi a tre domande e scopri il percorso migliore per migliorare in matematica con Theoremz.",
  alternates: { canonical: "/start-studente/form" },
  openGraph: {
    type: "website",
    title: "Quiz studente — Theoremz",
    description:
      "In meno di un minuto capisci se ti serve Theoremz Essential, Theoremz Black o il supporto 1:1, con garanzia 100% soddisfatti o rimborsati.",
    images: [{ url: "/metadata.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Quiz studente — Theoremz",
    description:
      "In meno di un minuto capisci se ti serve Theoremz Essential, Theoremz Black o il supporto 1:1, con garanzia 100% soddisfatti o rimborsati.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
};

export default function StartStudenteFormPage() {
  return <QuizClient />;
}
