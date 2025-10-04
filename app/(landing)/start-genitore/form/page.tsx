import QuizClient from "./QuizClient";

export const metadata = {
  title: "Quiz genitore — Percorso su misura per tuo figlio",
  description:
    "Rispondi a tre domande e scopri come aiutare tuo figlio a migliorare in matematica con il supporto giusto.",
  alternates: { canonical: "/start-genitore/form" },
  openGraph: {
    type: "website",
    title: "Quiz genitore — Theoremz",
    description:
      "Comprendi in meno di un minuto qual è il percorso ideale per tuo figlio con il supporto di Theoremz.",
    images: [{ url: "/metadata.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Quiz genitore — Theoremz",
    description:
      "Comprendi in meno di un minuto qual è il percorso ideale per tuo figlio con il supporto di Theoremz.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
};

export default function StartGenitoreFormPage() {
  return <QuizClient />;
}
