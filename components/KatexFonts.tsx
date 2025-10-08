// Componente per il caricamento asincrono dei font KaTeX
'use client';

import { useEffect } from 'react';


export default function KatexFonts() {
  useEffect(() => {
    // Carica i font KaTeX in modo asincrono
    const loadKatexFonts = async () => {
      // Import KaTeX CSS dinamicamente
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
      document.head.appendChild(link);
    };
    
    // Usa requestIdleCallback se disponibile, altrimenti setTimeout
    if (window.requestIdleCallback) {
      window.requestIdleCallback(loadKatexFonts);
    } else {
      setTimeout(loadKatexFonts, 1);
    }
  }, []);

  return null;
}