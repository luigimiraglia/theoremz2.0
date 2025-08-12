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
