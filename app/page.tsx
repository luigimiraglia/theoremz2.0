import TheoremzHero from "@/components/TheoremzHero";
import Hero from "../components/Hero";
import Index from "../components/Index";
import SocialProof from "../components/SocialProof";
import RisoluzioneEserciziCard from "@/components/RisoluzioneEserciziCard";
import TutorHero from "@/components/TutorHero";
import BlackPromo from "@/components/BlackPromo";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Theoremz",
            url: "https://theoremz.com",
            logo: "https://theoremz.com/metadata.png",
            sameAs: [
              "https://twitter.com/theoremz_",
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Theoremz",
            url: "https://theoremz.com",
            potentialAction: [
              {
                "@type": "SearchAction",
                target:
                  "https://theoremz.com/matematica?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
              {
                "@type": "SearchAction",
                target: "https://theoremz.com/fisica?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            ],
          }),
        }}
      />
      <Hero />
      <SocialProof />
      <Index />
      <TheoremzHero />
      <TutorHero />
      <BlackPromo />
      <RisoluzioneEserciziCard />
      <ThemeToggle />
    </>
  );
}
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
};
