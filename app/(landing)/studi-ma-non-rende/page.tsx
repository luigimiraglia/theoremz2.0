import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import PrintButton from "../guida-da-4-a-6/PrintButton";

const GUIDE_PATH = path.join(
  process.cwd(),
  "app/(landing)/studi-ma-non-rende/guide.html",
);

const GUIDE_HTML = fs.readFileSync(GUIDE_PATH, "utf8");

const STYLE_MATCH = GUIDE_HTML.match(/<style>([\s\S]*?)<\/style>/i);
const BODY_MATCH = GUIDE_HTML.match(/<body[^>]*>([\s\S]*)<\/body>/i);

const guideStyles = STYLE_MATCH?.[1] ?? "";
const guideBody = (BODY_MATCH?.[1] ?? GUIDE_HTML).replace(
  /href="#"/g,
  'href="/diagnosi-gratuita"',
);

export const metadata: Metadata = {
  title: "Studi ma non rende? — Guida Theoremz",
  description:
    "Guida pratica Theoremz per capire perché lo studio non rende, correggere il metodo e trasformare le ore di studio in risultati.",
  alternates: { canonical: "/studi-ma-non-rende" },
  openGraph: {
    title: "Studi ma non rende? — Guida Theoremz",
    description:
      "Guida pratica Theoremz per capire perché lo studio non rende, correggere il metodo e trasformare le ore di studio in risultati.",
    url: "https://theoremz.com/studi-ma-non-rende",
    siteName: "Theoremz",
    images: [{ url: "/metadata.png" }],
    type: "website",
    locale: "it_IT",
  },
  robots: { index: true, follow: true },
};

export default function StudiMaNonRendePage() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `${guideStyles}
            .guide-pdf-fab {
              position: fixed;
              right: 28px;
              bottom: 28px;
              z-index: 100;
            }

            @media (max-width: 880px) {
              .guide-pdf-fab {
                right: 16px;
                bottom: 16px;
              }
            }

            @media print {
              .guide-pdf-fab,
              .no-print {
                display: none !important;
              }
            }

            .guide-shell {
              color: #122033;
            }

            .guide-shell :is(h1, h2, h3, h4, h5, h6, p, li, td, th, span, small, strong, em) {
              color: #122033 !important;
            }

            .guide-shell :is(a:not(.button)) {
              color: #173aa9 !important;
            }

            .guide-shell :is(.topbar, .topbar *, .hero-card, .hero-card *, .cta, .cta *, .footer-cta, .footer-cta *, .quote, .quote *, section.dark > :not(.card), section.dark > :not(.card) *, .card.dark, .card.dark *) {
              color: #ffffff !important;
            }

            .guide-shell :is(.score-card, .toc, section.tint, .worksheet, .exercise, .card:not(.dark), .card:not(.dark) *, .callout, .callout *) {
              color: #122033 !important;
            }

            .guide-shell section.dark .callout,
            .guide-shell section.dark .callout *,
            .guide-shell .dark .card,
            .guide-shell .dark .card * {
              color: #122033 !important;
            }

            .guide-shell .button,
            .guide-shell .button * {
              color: #ffffff !important;
            }

            .guide-shell :is(.mini-label, .label, .badge, .formula) {
              color: #173aa9 !important;
            }

            .guide-shell section#verifica table,
            .guide-shell section#verifica thead,
            .guide-shell section#verifica tbody,
            .guide-shell section#verifica tr {
              background: #ffffff !important;
              color: #122033 !important;
            }

            .guide-shell section#verifica {
              background: linear-gradient(145deg, #f7fbff, #ffffff) !important;
              border-color: #dbe6f3 !important;
            }

            .guide-shell section#verifica .label,
            .guide-shell section#verifica h2,
            .guide-shell section#verifica h3,
            .guide-shell section#verifica p,
            .guide-shell section#verifica li {
              color: #122033 !important;
            }

            .guide-shell section#verifica .label {
              background: #eef5ff !important;
              border-color: #bfd0ea !important;
            }

            .guide-shell section#verifica .lead {
              color: #2f435f !important;
            }

            .guide-shell section#verifica th {
              background: #eaf1ff !important;
              color: #20324a !important;
              border-color: #d8e4f3 !important;
            }

            .guide-shell section#verifica td {
              background: #ffffff !important;
              color: #1f314a !important;
              border-color: #d8e4f3 !important;
            }

            .guide-shell section#verifica .soft-list li,
            .guide-shell section#verifica .soft-list li::before {
              color: #2f435f !important;
            }

            .guide-shell section#verifica .grid-3 .card,
            .guide-shell section#verifica .grid-3 .card * {
              color: #122033 !important;
            }

            .guide-shell :is(.topbar, .hero-card, .cta, .footer-cta, .quote, .card.dark) a,
            .guide-shell :is(.topbar, .hero-card, .cta, .footer-cta, .quote, .card.dark) span {
              color: inherit !important;
            }
          `,
        }}
      />

      <div className="guide-pdf-fab no-print">
        <PrintButton />
      </div>

      <main className="guide-shell">
        <div dangerouslySetInnerHTML={{ __html: guideBody }} />
      </main>
    </>
  );
}
