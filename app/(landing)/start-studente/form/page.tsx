import QuizClient from "./QuizClient";

export const metadata = {
  title: "Quiz Start Theoremz — Inizia in 1 minuto",
  description:
    "Rispondi a poche domande: capiamo chi sei e ti indirizziamo alla pagina giusta.",
  alternates: { canonical: "/start-studente/form" },
  openGraph: {
    type: "website",
    title: "Quiz Start Theoremz",
    description:
      "Rispondi a poche domande: capiamo chi sei e ti indirizziamo alla pagina giusta.",
    images: [{ url: "/metadata.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Quiz Start Theoremz",
    description:
      "Rispondi a poche domande: capiamo chi sei e ti indirizziamo alla pagina giusta.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
};

export default function StartStudenteFormPage() {
  return <QuizClient />;
}
