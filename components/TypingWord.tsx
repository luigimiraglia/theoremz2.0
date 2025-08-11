"use client";

import { useEffect, useRef, useState } from "react";

export default function TypingWord({ words }: { words: string[] }) {
  const [displayed, setDisplayed] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [mode, setMode] = useState<"typing" | "deleting">("typing");
  const timeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    const word = words[wordIndex];

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
        setWordIndex((i) => (i + 1) % words.length);
        setCharIndex(0);
      }
    }

    return () => clearTimeout(timeout.current);
  }, [charIndex, mode, wordIndex, words]);

  return <>{displayed}</>;
}
