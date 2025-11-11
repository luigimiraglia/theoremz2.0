# Copilot Instructions for theoremz2.0

## Project Overview

- This is a Next.js 14+ monorepo, bootstrapped with `create-next-app`.
- Main app code is in the `app/` directory, with subfolders for features (e.g., `admin/`, `api/`, `lezioni/`).
- UI components are in `components/`, shared logic/utilities in `lib/`, and types in `types/`.
- Styling uses Tailwind CSS (`tailwind.config.ts`, `postcss.config.mjs`, global styles in `app/globals.css`).
- Sanity integration is present (`sanity.config.ts`, `sanity/`), likely for CMS/content management.

## Developer Workflows

- **Start dev server:** `npm run dev` (or `yarn dev`, `pnpm dev`, `bun dev`)
- **Edit main page:** `app/page.tsx` (auto-updates)
- **Build:** `npm run build`
- **Sanity CLI:** Use `sanity.cli.ts` for content operations.
- **Tailwind:** Update config in `tailwind.config.ts` and use utility classes in components.

## Key Patterns & Conventions

- **Routing:** Uses Next.js app router. Route files are in `app/` subfolders, e.g., `app/(lezioni)/`, `app/admin/`.
- **Component Structure:** All UI components are in `components/`, named with PascalCase, and are mostly functional React components.
- **API routes:** Located in `app/api/`.
- **Global Providers:** See `app/providers.tsx` for context/providers setup.
- **SEO & Metadata:** Managed via `SeoJsonLd.tsx`, `opengraph-image.tsx`, and sitemap files in `app/`.
- **Fonts:** Uses `next/font` for optimized font loading (see `MathPreloadFonts.tsx`, `KatexFonts.tsx`).
- **Math Rendering:** KaTeX integration for math (see `KaTeX.tsx`, `MathText.tsx`).
- **State Management:** No Redux/MobX; relies on React context/hooks.
- **Critical CSS:** `app/critical.css` for above-the-fold styles.

## External Integrations

- **Sanity CMS:** Configured in `sanity.config.ts`, content schemas in `sanity/`.
- **Vercel:** Deployment optimized for Vercel (see README).
- **Recharts:** Used for charts (`GradesChartRecharts.tsx`).
- **Other:** Google, Senja, and WhatsApp integrations via dedicated components.

## Project-Specific Advice

- Prefer adding new features as subfolders in `app/` for clear routing.
- Place shared logic in `lib/`, not in components.
- Use Tailwind utility classes for styling; avoid custom CSS unless necessary.
- For math, use KaTeX components and preload fonts for performance.
- For new API endpoints, add files to `app/api/` and follow Next.js conventions.
- For Sanity changes, update `sanity.config.ts` and relevant schemas.

## Example: Adding a New Lesson Page

1. Create a folder in `app/(lezioni)/new-lesson/`.
2. Add `page.tsx` for the route.
3. Use components from `components/` and logic from `lib/`.
4. Style with Tailwind classes.
5. Update any relevant types in `types/`.

---

_If any section is unclear or missing, please provide feedback to improve these instructions._
