"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PortableText } from "@portabletext/react";
import { innerPtComponents } from "@/lib/innerPtComponents";
import MathText from "@/components/MathText";

interface FaqItem {
  _key: string;
  question: string;
  answer: any[];
}

interface Props {
  items: FaqItem[];
  heading?: string;
}

function toAnchorId(s: string) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export default function FaqAccordion({ items, heading }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const id = heading ? toAnchorId(heading) : undefined;

  return (
    <div className="not-prose my-8 scroll-mt-24" id={id}>
      {heading && (
        <div className="flex items-center gap-3 mb-4">
          <div className="h-7 w-1 rounded-full bg-indigo-500 [.dark_&]:bg-indigo-400 shrink-0" />
          <h2 className="text-2xl font-bold text-indigo-600 [.dark_&]:text-indigo-400 leading-tight">
            {heading}
          </h2>
        </div>
      )}
    <div className="rounded-2xl overflow-hidden border border-indigo-200 bg-white shadow-sm ring-1 ring-indigo-50 divide-y divide-indigo-100 [.dark_&]:border-indigo-800/60 [.dark_&]:bg-transparent [.dark_&]:ring-0 [.dark_&]:divide-indigo-900/40">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={item._key ?? i}
            className={
              isOpen
                ? "bg-indigo-50 [.dark_&]:bg-indigo-950/30"
                : "bg-white [.dark_&]:bg-slate-900/60"
            }
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full flex items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-indigo-50/80 [.dark_&]:hover:bg-indigo-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-inset"
            >
              <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-indigo-500 [.dark_&]:bg-indigo-600 flex items-center justify-center text-white font-black text-[10px] leading-none select-none">
                ?
              </span>
              <span className="flex-1 font-semibold text-slate-800 [.dark_&]:text-slate-100 leading-snug text-[0.95rem]">
                <MathText text={item.question} />
              </span>
              <ChevronDown
                size={16}
                className={`shrink-0 mt-0.5 text-indigo-400 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Grid-row animation: 0fr → 1fr */}
            <div
              className={`grid transition-all duration-200 ease-in-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-5 pt-2 text-slate-800 [.dark_&]:text-slate-300 border-t border-indigo-100 [.dark_&]:border-indigo-900/40">
                  <PortableText
                    value={item.answer ?? []}
                    components={innerPtComponents}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}
