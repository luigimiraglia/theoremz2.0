// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: "class", // << usa la classe .dark invece dei media query
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
} satisfies Config;
