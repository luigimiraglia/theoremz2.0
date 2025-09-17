"use client";
import { ThemeProvider } from "next-themes";
import React, { useState, useEffect } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prima del mount renderizza direttamente i children: il tema iniziale è già applicato
  // dallo script in <head> (theme-init), quindi niente flash.
  if (!mounted) return <>{children}</>;

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="theme"
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
