import TypingWord from "./TypingWord";
import HeroImage from "./HeroImage";

const HERO_WORDS = ["semplice", "chiara", "completa", "guidata"];
const MIN_CH = Math.max(...HERO_WORDS.map((w) => w.length)); // spazio stabile

export default function Hero() {
  return (
    <div className="flex text-[var(--fg)] flex-col-reverse md:flex-row max-w-screen-xl sm:mx-6 xl:mx-auto">
      <div className="md:w-1/2 flex flex-col py-10 px-6 sm:px-4 space-y-3 sm:space-y-5 justify-center">
        <h1 className="text-3xl sm:text-4xl font-bold opacity-90">
          Theoremz, scopri
          <br />
          la matematica{" "}
          <span
            className="text-blue-600/90 inline-block"
            style={{ minWidth: `${MIN_CH}ch` }}
          >
            <TypingWord words={HERO_WORDS} />
          </span>
        </h1>

        <p className="text-md text-[var(--fg)] font-medium">
          Benvenuto nella piattaforma definitiva per lo studio di matematica e
          fisica! Abbiamo trattato tutti gli argomenti in modo semplice ma
          preciso, con schemi, grafici, esercizi e appunti per guidarti nello
          studio. Inizia ora!
        </p>

        <button className="bg-blue-500 text-white rounded-xl px-10 py-3 font-bold sm:w-fit w-full text-2xl">
          Unisciti
        </button>
      </div>

      {/* padding identico a prima */}
      <div className="md:w-1/2 px-6 sm:px-22 md:px-0 lg:px-6">
        <HeroImage />
      </div>
    </div>
  );
}
