"use client";

import { useState } from 'react';
import Link from 'next/link';
import FlashCard from '@/components/FlashCard';
import MathText from '@/components/MathText';

// Formule di test di geometria analitica
const testFormulas = [
  {
    id: '1',
    title: 'Distanza tra due punti',
    formula: '\\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}',
    explanation: 'La distanza tra due punti P₁(x₁,y₁) e P₂(x₂,y₂) si calcola usando il teorema di Pitagora applicato alle differenze delle coordinate.'
  },
  {
    id: '2',
    title: 'Equazione ellisse',
    formula: '\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1',
    explanation: 'Equazione canonica dell\'ellisse in forma normale. a è il semiasse maggiore, b il semiasse minore.'
  },
  {
    id: '3',
    title: 'Eccentricità ellisse',
    formula: 'e = \\frac{c}{a}',
    explanation: 'Eccentricità dell\'ellisse. Rapporto tra la distanza dal centro ad un fuoco (c) e il semiasse maggiore (a). È sempre minore di 1.'
  },
  {
    id: '4',
    title: 'Area ellisse',
    formula: 'A = \\pi ab',
    explanation: 'Area dell\'ellisse. Si calcola moltiplicando π per i due semiassi.'
  }
];

export default function FlashCardsExercise() {
  const lessonName = "Geometria Analitica: Ellisse";
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remembered, setRemembered] = useState<boolean[]>(Array(testFormulas.length).fill(false));
  const [finished, setFinished] = useState(false);

  const handleStart = () => {
    setStarted(true);
    setCurrentIndex(0);
    setRemembered(Array(testFormulas.length).fill(false));
    setFinished(false);
  };

  const handleRemember = (id: string, value: boolean) => {
    const idx = testFormulas.findIndex(f => f.id === id);
    if (idx !== -1) {
      const updated = [...remembered];
      updated[idx] = value;
      setRemembered(updated);
      if (currentIndex < testFormulas.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setFinished(true);
      }
    }
  };

  const handleRestart = () => {
    setStarted(false);
    setCurrentIndex(0);
    setRemembered(Array(testFormulas.length).fill(false));
    setFinished(false);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 prose prose-slate dark:prose-invert overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        {/* Header simile alle lezioni */}
        <header className="rounded-2xl [.dark_&]:bg-slate-800/80 space-y-2 bg-gray-50 text-center pt-6 pb-6 mb-8">
          <h1 className="text-[27px] px-3 sm:text-4xl font-bold opacity-95 leading-tight">
            Flashcard per la lezione
          </h1>
          <h2 className="font-semibold text-sm sm:text-[16px] px-3 text-blue-600 [.dark_&]:text-blue-400">
            {lessonName}
          </h2>
        </header>

        {!started && !finished && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 mb-6 rounded-full bg-blue-50 [.dark_&]:bg-blue-900/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-600 [.dark_&]:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-lg text-slate-600 [.dark_&]:text-slate-300 mb-8 max-w-md text-center leading-relaxed">
              Verifica la tua comprensione delle formule chiave di questa lezione con delle flashcard interattive.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleStart}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-md hover:brightness-110 hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                <span>Inizia Esercizio</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
                <Link
                  href="/ellisse"
                  className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold shadow-sm hover:bg-slate-50 transition"
                >
                  Torna alla lezione
                </Link>
              </div>
            </div>
          )}
          {started && !finished && (
            <div className="mb-8">
              {/* Progress Bar */}
              <div className="w-full max-w-2xl mx-auto mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-600">Progresso</span>
                  <span className="text-sm font-medium text-slate-600">
                    {currentIndex + 1} di {testFormulas.length}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((currentIndex + 1) / testFormulas.length) * 100}%` }}
                  ></div>
                </div>
                
                {/* Statistics */}
                <div className="flex justify-center gap-6 mt-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-600">
                      {remembered.filter(Boolean).length}
                    </div>
                    <div className="text-xs text-slate-600">Memorizzate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-600">
                      {remembered.filter(val => val === false).length}
                    </div>
                    <div className="text-xs text-slate-600">Da rivedere</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-400">
                      {testFormulas.length - remembered.filter(val => val !== undefined).length}
                    </div>
                    <div className="text-xs text-slate-600">Non viste</div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <FlashCard
                  key={testFormulas[currentIndex].id}
                  title={testFormulas[currentIndex].title}
                  formula={testFormulas[currentIndex].formula}
                  explanation={testFormulas[currentIndex].explanation}
                  id={testFormulas[currentIndex].id}
                  onRemember={handleRemember}
                  isRemembered={remembered[currentIndex]}
                />
              </div>
            </div>
          )}
          {finished && (
            <div className="flex flex-col items-center justify-center py-12">
              {remembered.filter(Boolean).length === testFormulas.length ? (
                <>
                  <div className="w-24 h-24 mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg className="w-12 h-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-emerald-700 mb-4">
                    Complimenti!
                  </h2>
                  <p className="text-lg text-slate-600 mb-2">
                    Hai memorizzato tutte le {testFormulas.length} formule!
                  </p>
                  <p className="text-emerald-600 font-medium mb-8">Ottimo lavoro, continua così!</p>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 mb-6 rounded-full bg-slate-100 flex items-center justify-center">
                    <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-700 mb-4">
                    Risultato Finale
                  </h2>
                  <p className="text-lg text-slate-600 mb-2">
                    Hai memorizzato {remembered.filter(Boolean).length} su {testFormulas.length} formule
                  </p>
                  <p className="text-slate-500 font-medium mb-8">Continua ad esercitarti per migliorare!</p>
                </>
              )}
              
              <div className="flex gap-4">
                <button
                  onClick={handleRestart}
                  className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold shadow-sm hover:bg-slate-50 transition"
                >
                  ↺ Riprova
                </button>
                <Link
                  href="/ellisse"
                  className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  <span>Torna alla lezione</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}