"use client";

import { useEffect, useRef } from "react";
import { FaInfinity, FaSquareRootAlt } from "react-icons/fa";
import { PiCubeFocusFill } from "react-icons/pi";
import { LuSigma } from "react-icons/lu";
import { BsGraphUp } from "react-icons/bs";
import Image from "next/image";

type MarqueeItem = {
  label: string;
  icon: React.ReactNode; // oppure React.ReactElement
};

type MarqueeProps = {
  items: MarqueeItem[];
  ariaHidden?: boolean;
};

export default function TheoremzHero() {
  const items = [
    { label: "Limiti", icon: <FaInfinity /> },
    { label: "Dinamica", icon: <BsGraphUp /> },
    { label: "Integrali", icon: <LuSigma /> },
    { label: "Serie", icon: <LuSigma /> },
    { label: "Radicali", icon: <FaSquareRootAlt /> },
    { label: "Studio di funzione", icon: <BsGraphUp /> },
    { label: "Poliedri", icon: <PiCubeFocusFill /> },
  ];

  return (
    <section className="mt-6 max-w-screen-xl [.dark_&]:bg-slate-800 bg-gray-100/60 sm:px-6 sm:py-8 lg:px-10 mx-6 selection xl:mx-auto rounded-[24px] px-3 py-3 shadow-[inset_0_1px_0_rgba(0,0,0,0.04)]">
      {/* CAROUSEL con fade ai lati */}
      <div className="relative overflow-hidden rounded-[16px]">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-gray-50 [.dark_&]:from-slate-800 to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-gray-50 [.dark_&]:from-slate-800 to-transparent z-10" />
        <div className="[--duration:26s] group flex h-16 items-center">
          <Marquee items={items} />
          <Marquee items={items} ariaHidden />
        </div>
      </div>

      {/* HERO */}
      <div className="grid grid-cols-1 gap-4 sm:gap-8 px-2 pt-4 md:grid-cols-2 md:items-center">
        {/* Testo */}
        <div>
          <h1 className="text-3xl font-bold leading-[1.15] tracking-tight md:text-[30px]">
            Tutti gli argomenti di{" "}
            <span className="text-sky-600 decoration-[3px] decoration-sky-300/70 ">
              superiori
            </span>{" "}
            e{" "}
            <span className="text-sky-600 decoration-[3px] decoration-sky-300/70">
              medie
            </span>{" "}
            trattati ✅
          </h1>
          <p className="mt-4 text-[15.5px] font-medium leading-relaxed md:text-base">
            Su{" "}
            <span className="text-blue-600 font-semibold hover:text-blue-700">
              Theoremz
            </span>{" "}
            trovi spiegazioni, quiz ed esercizi su tutti gli argomenti delle
            scuole superiori e oltre! C&apos;è proprio tutto 😉
          </p>
        </div>

        {/* Illustrazione con dimensioni fisse per evitare layout shift */}
        <div className="relative mx-auto max-w-full">
          <Image
            alt="Carousel Theoremz"
            src="/images/carousel.svg"
            id="icon"
            width={400}
            height={300}
          />
        </div>
      </div>

      {/* CSS per marquee */}
      <style>{`
        @keyframes marqueeScroll { 
          from { transform: translateX(0); } 
          to   { transform: translateX(-50%); } 
        }
        .marquee-track { 
          animation: marqueeScroll var(--duration,26s) linear infinite; 
        }
        .marquee-track:hover { animation-play-state: paused; }
      `}</style>
    </section>
  );
}

function Marquee({ items, ariaHidden = false }: MarqueeProps) {
  const row: MarqueeItem[] = [...items, ...items, ...items];

  return (
    <ul
      className="marquee-track flex shrink-0 items-center gap-2 sm:gap-4 pr-4 will-change-transform"
      aria-hidden={ariaHidden}
    >
      {row.map((it, i) => (
        <li key={`${it.label}-${i}`}>
          <button
            type="button"
            className="inline-flex select-none items-center gap-2 rounded-[14px] border-2 border-slate-900/70 px-4 py-2 text-[15px] font-semibold shadow-[0_2px_0_#0f172a] active:translate-y-[1px] active:shadow-none"
          >
            <span className="inline-block text-[18px] leading-none">
              {it.icon}
            </span>
            <span>{it.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
