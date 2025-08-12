// components/ThemeToggle.tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark =
    theme === "dark" || (theme === "system" && resolvedTheme === "dark");

  return (
    <button
      type="button"
      aria-label="Cambia tema"
      role="switch"
      aria-checked={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="absolute top-26 right-4 md:top-26 md:right-4"
    >
      {/* Contenitore segmentato, piatto, leggibile */}
      <div
        className={[
          "relative inline-flex h-9 w-20 select-none items-center rounded-full",
          "border-gray-300 border-2 dark:border-blue-800",
          "bg-blue-500",
          "text-[13px] font-medium",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
        ].join(" ")}
      >
        {/* Evidenziatore che scorre */}
        <motion.span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gray-100 dark:bg-blue-900"
          animate={{ x: isDark ? "100%" : "0%" }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        />

        {/* Segmento Light */}
        <span
          className={[
            "relative z-10 w-1/2 flex items-center justify-center gap-1",
            "text-gray-900",
          ].join(" ")}
        >
          {/* Sole (stesso SVG di prima) */}
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="16"
            height="16"
          >
            <circle cx="12" cy="12" r="5" fill="#f59e0b" />
          </svg>
        </span>

        {/* Segmento Dark */}
        <span
          className={[
            "relative z-10 w-1/2 flex items-center justify-center gap-1",
            "text-gray-100",
          ].join(" ")}
        >
          {/* Luna (stesso SVG di prima) */}
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="16"
            height="16"
          >
            <path fill="#fff" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        </span>
      </div>
    </button>
  );
}
