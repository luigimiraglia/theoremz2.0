// app/providers.tsx
"use client";

import { ThemeProvider } from "next-themes";
import React from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class" // <- importantissimo: mette/rimuove .dark su <html>
      defaultTheme="system" // usa il tema di sistema alla prima visita
      enableSystem // abilita auto tema
      storageKey="theme" // chiave in localStorage (coerente col toggle)
    >
      {children}
    </ThemeProvider>
  );
}
