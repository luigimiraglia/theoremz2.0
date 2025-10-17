// components/ThemeToggle.tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  position?: "absolute" | "relative";
}

export default function ThemeToggle({
  position = "absolute",
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark =
    theme === "dark" || (theme === "system" && resolvedTheme === "dark");

  const baseClasses =
    "inline-flex items-center justify-center rounded-xl w-8 h-8 sm:w-10 sm:h-10 backdrop-blur-sm transition-all duration-300";
  const positionClasses =
    position === "absolute"
      ? "absolute top-26 right-4 md:top-26 md:right-4"
      : "";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`${baseClasses} ${positionClasses} ${
        isDark
          ? "bg-slate-800/90 border border-slate-600 hover:bg-slate-700/90"
          : "bg-white/90 border border-gray-200 hover:bg-white"
      }`}
    >
      {isDark ? (
        <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white transition-all duration-300" />
      ) : (
        <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600 transition-all duration-300" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
