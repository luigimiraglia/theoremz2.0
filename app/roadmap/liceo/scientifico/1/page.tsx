import type { Metadata } from "next";
import RoadmapView from "./RoadmapView";

export const metadata: Metadata = {
  title: "Roadmap 1° Liceo Scientifico | Theoremz",
  description: "Percorso completo di matematica e fisica per il primo anno di liceo scientifico. Segui la roadmap step-by-step per padroneggiare tutti i concetti.",
};

export default function RoadmapPage() {
  return <RoadmapView />;
}