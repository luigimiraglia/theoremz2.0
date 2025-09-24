import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Esercizi svolti di matematica e fisica — con passaggi e soluzioni",
  description:
    "Allenati con esercizi svolti passo passo: tracce chiare, soluzioni e passaggi spiegati. Filtra per lezione e livello.",
  alternates: { canonical: "/esercizi" },
  robots: { index: true, follow: true, "max-image-preview": "large" },
  openGraph: {
    type: "website",
    title: "Esercizi svolti di matematica e fisica",
    description:
      "Allenati con esercizi svolti passo passo: tracce chiare, soluzioni e passaggi spiegati.",
    images: [{ url: "/opengraph-image" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Esercizi svolti di matematica e fisica",
    description:
      "Allenati con esercizi svolti passo passo: tracce chiare, soluzioni e passaggi spiegati.",
    images: ["/opengraph-image"],
    site: "@theoremz_",
  },
};
