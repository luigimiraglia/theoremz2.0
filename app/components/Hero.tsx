"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
const HERO_WORDS = ["semplice", "chiara", "completa", "guidata"];

export default function Hero() {
  const [displayed, setDisplayed] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [mode, setMode] = useState<"typing" | "deleting">("typing");
  const timeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    const word = HERO_WORDS[wordIndex];
    if (mode === "typing") {
      if (charIndex <= word.length) {
        timeout.current = window.setTimeout(() => {
          setDisplayed(word.slice(0, charIndex));
          setCharIndex((i) => i + 1);
        }, 120);
      } else {
        timeout.current = window.setTimeout(() => setMode("deleting"), 1400);
      }
    } else {
      if (charIndex >= 0) {
        timeout.current = window.setTimeout(() => {
          setDisplayed(word.slice(0, charIndex));
          setCharIndex((i) => i - 1);
        }, 60);
      } else {
        setMode("typing");
        setWordIndex((i) => (i + 1) % HERO_WORDS.length);
        setCharIndex(0);
      }
    }
    return () => clearTimeout(timeout.current);
  }, [charIndex, mode, wordIndex]);
  return (
    <div className="flex flex-col-reverse md:flex-row max-w-screen-xl sm:mx-6 xl:mx-auto">
      <div className="md:w-1/2 flex flex-col py-10 px-6 sm:px-4 space-y-3 sm:space-y-5 justify-center">
        <h1 className=" text-3xl sm:text-4xl font-bold opacity-90">
          Theoremz, scopri la matematica{" "}
          <span className="text-blue-600/90">{displayed}</span>
        </h1>
        <p className="text-md font-medium">
          Benvenuto nella piattaforma definitiva per lo studio di matematica e
          fisica! Abbiamo trattato tutti gli argomenti in modo semplice ma
          preciso, con schemi, grafici, esercizi e appunti per guidarti nello
          studio. Inizia ora!
        </p>
        <button className="bg-blue-500 text-white w-100% rounded-xl px-10 py-3 font-bold font-stretch-110% sm:w-fit text-2xl">
          Unisciti
        </button>
      </div>
      <div className="md:w-1/2 px-6 sm:px-22 md:px-0 lg:px-6">
        <Image
          className="w-fit"
          alt="welcome image"
          src="/wimage.svg"
          height={400}
          width={400}
        />
      </div>
    </div>
  );
}
