"use client";
import type { PortableTextBlock } from "sanity";
import { useState } from "react";
import { PortableText } from "@portabletext/react";
import { ptComponents } from "@/lib/ptComponents";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ListTree, BookOpen } from "lucide-react";
import Link from "next/link";

export type Exercise = {
  _id: string;
  titolo: string;
  testo?: PortableTextBlock[];
  soluzione?: PortableTextBlock[];
  passaggi?: PortableTextBlock[];
  lesson?: { title?: string; slug?: string | null } | null;
};

export default function ExerciseCard({ ex }: { ex: Exercise }) {
  const [showSol, setShowSol] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-2xl bg-gray-100/60 [.dark_&]:bg-slate-800 transition-shadow w-full max-w-6xl mx-auto"
    >
      <div className="h-3 w-full bg-gradient-to-r to-sky-500 from-blue-500" />

      <div className="p-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl md:text-2xl font-bold tracking-tight leading-snug text-slate-900 [.dark_&]:text-white">
            {ex.titolo}
          </h3>
          {ex.lesson?.title && (
            <Link
              href={`/${ex.lesson.slug}`}
              className="mt-2 inline-flex items-center gap-1 rounded-xl border-2 border-[#2b7fff] bg-gradient-to-r from-[#2b7fff]/10 to-[#559dff]/20 px-3 py-1 text-sm font-medium text-[#1a5fd6] [.dark_&]:text-white hover:from-[#2b7fff]/20 hover:to-[#559dff]/30"
            >
              {ex.lesson.title}
            </Link>
          )}
        </div>

        {ex.testo?.length && (
          <div className="prose prose-slate max-w-none mt-4 text-[16px]">
            <PortableText value={ex.testo} components={ptComponents} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-4">
          {ex.soluzione?.length && (
            <button
              onClick={() => setShowSol(!showSol)}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-200 to-emerald-300 px-4 py-1.5 text-sm font-semibold text-emerald-900 ring-2 ring-emerald-400 hover:from-emerald-300 hover:to-emerald-400"
            >
              {showSol ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {showSol ? "Nascondi soluzione" : "Mostra soluzione"}
            </button>
          )}

          {ex.passaggi?.length && (
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#dce9ff] [.dark_&]:bg-slate-800 to-[#a8cfff] px-4 py-1.5 text-sm font-semibold text-[#1a5fd6] ring-2 ring-[#2b7fff] hover:from-[#c7dcff] hover:to-[#90baff]"
            >
              <ListTree className="h-4 w-4" />
              {showSteps ? "Nascondi passaggi" : "Mostra passaggi"}
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {showSol && ex.soluzione?.length && (
            <motion.div
              key="sol"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="mt-4 overflow-hidden rounded-lg border-2 border-emerald-400 bg-white  [.dark_&]:bg-slate-800  p-4"
            >
              <div className="flex items-center gap-2 text-emerald-900 [.dark_&]:text-emerald-400 text-sm font-bold">
                <BookOpen className="h-4 w-4" /> Soluzione
              </div>
              <div className="prose prose-slate max-w-none mt-2">
                <PortableText value={ex.soluzione} components={ptComponents} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {showSteps && ex.passaggi?.length && (
            <motion.div
              key="steps"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="mt-4 overflow-hidden rounded-lg border-2 border-blue-500 bg-white [.dark_&]:bg-slate-800 p-4"
            >
              <div className="flex items-center gap-2 text-blue-500 [.dark_&]:text-blue-500 text-sm font-bold">
                <ListTree className="h-4 w-4" /> Passaggi
              </div>
              <div className="prose prose-slate max-w-none mt-2">
                <PortableText value={ex.passaggi} components={ptComponents} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
