"use client";

import { useState } from 'react';
import { KaInline } from './KaTeX';

interface FlashCardProps {
  title: string;
  formula: string;
  explanation: string;
  id: string;
  onRemember: (id: string, remembered: boolean) => void;
  isRemembered?: boolean;
}

export default function FlashCard({ title, formula, explanation, id, onRemember, isRemembered: initialIsRemembered = false }: FlashCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isRemembered, setIsRemembered] = useState(initialIsRemembered);
  const [isRevealed, setIsRevealed] = useState(false);

  const handleFlip = () => {
    if (!isRevealed) {
      setIsRevealed(true);
    }
    setIsFlipped(!isFlipped);
  };

  const handleRemember = (remembered: boolean) => {
    setIsRemembered(remembered);
    onRemember(id, remembered);
  };

  return (
    <div 
      className={`relative w-full max-w-4xl mx-auto aspect-[4/3] cursor-pointer group transition-all duration-300
        ${isRemembered ? 'opacity-90 scale-95' : 'hover:scale-[1.02] active:scale-95'}`}
    >
      <div 
        className={`w-full h-full duration-700 ease-out [transform-style:preserve-3d] [perspective:1000px] ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        }`}
        onClick={handleFlip}
      >
        {/* Front - Formula Name */}
        <div className="absolute w-full h-full [backface-visibility:hidden]">
          <div className="relative flex flex-col items-center justify-center w-full h-full p-6 sm:p-8 text-center bg-gray-50 [.dark_&]:bg-slate-800/80 rounded-2xl border border-gray-200 [.dark_&]:border-slate-600 group-hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="relative text-xl sm:text-3xl font-bold text-slate-800 [.dark_&]:text-white transform transition-transform duration-300 group-hover:scale-105 leading-tight opacity-95">
              {title}
            </div>
            <div className="mt-4 text-sm text-slate-500 [.dark_&]:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block">
              Clicca per rivelare la formula
            </div>
            <div className="mt-4 text-sm text-slate-500 [.dark_&]:text-slate-400 sm:hidden">
              Tocca per rivelare la formula
            </div>
          </div>
        </div>

        {/* Back - Formula LaTeX */}
        <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="relative flex flex-col items-center justify-center w-full h-full p-6 sm:p-8 text-center bg-gray-50 [.dark_&]:bg-slate-800/80 rounded-2xl border border-gray-200 [.dark_&]:border-slate-600 group-hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="mb-4 text-sm font-semibold text-blue-600 [.dark_&]:text-blue-400 uppercase tracking-wide">
              Formula
            </div>
            <div className="mb-6 px-6 py-4 bg-white [.dark_&]:bg-slate-700 rounded-xl shadow-sm border border-gray-100 [.dark_&]:border-slate-600 hover:shadow-md transition-all duration-300 max-w-full overflow-x-auto">
              <div className="text-lg sm:text-xl [.dark_&]:text-white">
                <KaInline>{formula}</KaInline>
              </div>
            </div>
            <div className="text-sm text-slate-600 [.dark_&]:text-slate-300 leading-relaxed max-w-[95%] sm:max-w-[90%] overflow-hidden">
              {explanation}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute -bottom-4 left-0 right-0 flex justify-center gap-3 px-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemember(true);
          }}
          className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm font-semibold transition-all duration-300 transform touch-manipulation shadow-md ${
            isRemembered
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white scale-105 hover:brightness-110'
              : 'bg-white [.dark_&]:bg-slate-700 hover:bg-emerald-50 [.dark_&]:hover:bg-emerald-900/20 border border-gray-200 [.dark_&]:border-slate-600 text-slate-700 [.dark_&]:text-slate-300 hover:text-emerald-700 [.dark_&]:hover:text-emerald-400 hover:border-emerald-200 hover:scale-105 active:scale-95'
          }`}
        >
          {isRemembered ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Memorizzata</span>
            </span>
          ) : (
            <>
              <span className="hidden sm:inline">🎯 So questa</span>
              <span className="sm:hidden">✓ OK</span>
            </>
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemember(false);
          }}
          className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm font-semibold transition-all duration-300 transform touch-manipulation shadow-md ${
            !isRemembered
              ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-white scale-105 hover:brightness-110'
              : 'bg-white [.dark_&]:bg-slate-700 hover:bg-amber-50 [.dark_&]:hover:bg-amber-900/20 border border-gray-200 [.dark_&]:border-slate-600 text-slate-700 [.dark_&]:text-slate-300 hover:text-amber-700 [.dark_&]:hover:text-amber-400 hover:border-amber-200 hover:scale-105 active:scale-95'
          }`}
        >
          {!isRemembered ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Da rivedere</span>
            </span>
          ) : (
            <>
              <span>🔄 Rivedi</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}