// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: "class", // << usa la classe .dark invece dei media query
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "200% 0%" },
        },
        gentlePulse: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.015)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.2s linear infinite",
        gentlePulse: "gentlePulse 4.5s ease-in-out infinite",
      },
    },
  },
} satisfies Config;
