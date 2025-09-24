"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BlackPopup from "./BlackPopup";
import { useAuth } from "@/lib/AuthContext";
import { track } from "@/lib/analytics";

// Defer heavy react-pdf imports until viewer opens
const ReactPdf: {
  Document?: any;
  Page?: any;
  pdfjs?: any;
} = {};

type PdfEntry = { name: string; url: string };

/* Hook: misura larghezza contenitore per fare fit-to-width */
function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setW(Math.floor(cr.width));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, width: w };
}

export default function LessonNotes({
  lessonTitle,
  lessonSlug,
}: {
  lessonTitle: string;
  lessonSlug: string;
}) {
  const { isSubscribed } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [open, setOpen] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);

  const [pdfList, setPdfList] = useState<PdfEntry[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  const { ref: viewerRef, width: viewerWidth } =
    useContainerWidth<HTMLDivElement>();

  // 🔍 Zoom state
  const [zoom, setZoom] = useState(1.15); // default un filo più grande per mobile
  const ZMIN = 0.6;
  const ZMAX = 2.6;
  const ZSTEP = 0.15;

  const currentPdf = useMemo(
    () => pdfList[currentIdx]?.url ?? null,
    [pdfList, currentIdx]
  );

  const absUrl = useMemo(() => {
    if (!currentPdf) return null;
    try {
      return new URL(currentPdf, window.location.origin).toString();
    } catch {
      return currentPdf;
    }
  }, [currentPdf]);

  const handleOpen = async () => {
    if (!isSubscribed) return setShowPopup(true);
    // Lazy import react-pdf only when opening the viewer
    if (!pdfReady) {
      try {
        const mod = await import("react-pdf");
        ReactPdf.Document = mod.Document;
        ReactPdf.Page = mod.Page;
        ReactPdf.pdfjs = mod.pdfjs;
        ReactPdf.pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${ReactPdf.pdfjs.version}/pdf.worker.min.mjs`;
        setPdfReady(true);
      } catch {
        // ignore; rendering will fail gracefully
      }
    }
    setOpen(true);
    try {
      track("notes_open_click", { lesson_slug: lessonSlug, lesson_title: lessonTitle });
    } catch {}
  };

  type ApiPdfFile = {
    title?: string;
    name: string;
    url: string;
  };

  type PdfEntry = {
    name: string;
    url: string;
  };

  useEffect(() => {
    if (!open || !lessonSlug) return;

    (async () => {
      try {
        const res = await fetch(
          `/api/notes/${encodeURIComponent(lessonSlug)}`,
          { cache: "no-store" }
        );
        const data = (await res.json()) as { files?: ApiPdfFile[] };

        const entries: PdfEntry[] = (data.files || []).map((f: ApiPdfFile) => ({
          name: f.title || f.name,
          url: f.url,
        }));

        setPdfList(entries);
        setCurrentIdx(0);
        setPageNumber(1);
      } catch {
        setPdfList([]);
      }
    })();
  }, [open, lessonSlug]);

  // Keyboard shortcuts (desktop)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "+" || e.key === "=")
        setZoom((z) => Math.min(ZMAX, +(z + ZSTEP).toFixed(2)));
      if (e.key === "-" || e.key === "_")
        setZoom((z) => Math.max(ZMIN, +(z - ZSTEP).toFixed(2)));
      if (e.key === "ArrowRight" && !e.shiftKey)
        setPageNumber((p) => Math.min(numPages || p, p + 1));
      if (e.key === "ArrowLeft" && !e.shiftKey)
        setPageNumber((p) => Math.max(1, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, numPages]);

  // 👆 Pinch-to-zoom + double-tap
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;

    let lastTap = 0;
    let startDist = 0;
    let startZoom = zoom;

    const getDist = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.hypot(dx, dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTap < 300) {
          // double tap: zoom in (toggle)
          setZoom((z) => Math.min(ZMAX, +(z * 1.3).toFixed(2)));
          lastTap = 0;
        } else {
          lastTap = now;
        }
      }
      if (e.touches.length === 2) {
        startDist = getDist(e.touches[0], e.touches[1]);
        startZoom = zoom;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        const d = getDist(e.touches[0], e.touches[1]);
        const factor = d / startDist;
        const next = Math.max(
          ZMIN,
          Math.min(ZMAX, +(startZoom * factor).toFixed(2))
        );
        setZoom(next);
        e.preventDefault();
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [viewerRef, zoom]);

  // base width del Page (fit-to-width con padding)
  const baseWidth = Math.max(
    240,
    Math.min(viewerWidth - (viewerWidth < 480 ? 8 : 24), 1200)
  );

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className=" font-semibold shadow-md px-2 mr-3 text-[14px] sm:text-base rounded-md [.dark_&]:text-white [.dark_&]:bg-slate-800 bg-gray-100 border-2 "
        aria-label="Apri Appunti"
      >
        Appunti
      </button>

      {/* Viewer */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
          <div className="w-full h-full sm:h-[86vh] sm:max-w-6xl sm:rounded-2xl bg-white overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-sky-500 text-white">
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-semibold truncate">
                  Appunti — {lessonTitle}
                </div>
                {/* Mobile: selettore file */}
                <div className="mt-1 sm:hidden">
                  {pdfList.length > 0 ? (
                    <select
                      value={currentIdx}
                      onChange={(e) => {
                        setCurrentIdx(Number(e.target.value));
                        setPageNumber(1);
                      }}
                      className="text-[12px] text-white rounded-md px-2 py-1"
                    >
                      {pdfList.map((f, i) => (
                        <option value={i} key={f.url}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[11px] opacity-90">Nessun file</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Zoom (desktop header) */}
                <div className="hidden sm:flex items-center gap-1 bg-white/15 rounded-lg px-2 py-1">
                  <button
                    className="px-2 py-1 rounded hover:bg-white/20"
                    onClick={() =>
                      setZoom((z) => Math.max(ZMIN, +(z - ZSTEP).toFixed(2)))
                    }
                    title="Zoom -"
                  >
                    −
                  </button>
                  <span className="text-[11px] w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    className="px-2 py-1 rounded hover:bg-white/20"
                    onClick={() =>
                      setZoom((z) => Math.min(ZMAX, +(z + ZSTEP).toFixed(2)))
                    }
                    title="Zoom +"
                  >
                    ＋
                  </button>
                </div>

                {/* Download */}
                {currentPdf && (
                  <a
                    href={currentPdf}
                    download
                    className="hidden sm:inline-block px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-sm"
                  >
                    ⬇ Scarica
                  </a>
                )}

                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md hover:bg-white/20"
                  aria-label="Chiudi"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 flex min-h-0">
              {/* Sidebar (desktop) */}
              <aside className="hidden sm:block w-56 shrink-0 border-r bg-gray-50/70 overflow-auto">
                {pdfList.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">
                    Nessun PDF trovato in{" "}
                    <code>/public/notes/{lessonSlug}</code>
                  </div>
                ) : (
                  <ul className="py-2">
                    {pdfList.map((f, i) => (
                      <li key={f.url}>
                        <button
                          onClick={() => {
                            setCurrentIdx(i);
                            setPageNumber(1);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-sky-50 ${
                            i === currentIdx ? "bg-sky-100 font-medium" : ""
                          }`}
                          title={f.name}
                        >
                          <div className="truncate">{f.name}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>

              {/* Viewer Pane */}
              <main className="flex-1 bg-gray-100 overflow-auto">
                <div
                  ref={viewerRef}
                  className="h-full w-full flex flex-col items-center justify-center p-2 sm:p-4"
                >
                  {absUrl && pdfReady ? (
                    <>
                      <ReactPdf.Document
                        file={absUrl}
                        onLoadSuccess={(info: { numPages: number }) => {
                          const { numPages } = info;
                          setNumPages(numPages);
                          setPageNumber(1);
                        }}
                        onLoadError={(e: unknown) =>
                          console.error("PDF load error:", e)
                        }
                        loading={
                          <div className="text-gray-500">Caricamento…</div>
                        }
                      >
                        <ReactPdf.Page
                          pageNumber={pageNumber}
                          width={baseWidth}
                          scale={zoom} // 👈 zoom vero
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </ReactPdf.Document>

                      {/* Controls (sticky in basso su mobile) */}
                      <div className="sm:mt-4 sm:static fixed inset-x-0 bottom-0 sm:inset-auto bg-white sm:bg-transparent border-t sm:border-0 p-2 sm:p-0 flex items-center justify-center gap-2">
                        {/* Zoom (mobile) */}
                        <div className="sm:hidden flex items-center gap-2">
                          <button
                            onClick={() =>
                              setZoom((z) =>
                                Math.max(ZMIN, +(z - ZSTEP).toFixed(2))
                              )
                            }
                            className="px-3 py-1 rounded bg-white hover:bg-gray-100"
                            title="Zoom -"
                          >
                            −
                          </button>
                          <span className="text-sm w-12 text-center">
                            {Math.round(zoom * 100)}%
                          </span>
                          <button
                            onClick={() =>
                              setZoom((z) =>
                                Math.min(ZMAX, +(z + ZSTEP).toFixed(2))
                              )
                            }
                            className="px-3 py-1 rounded bg-white hover:bg-gray-100"
                            title="Zoom +"
                          >
                            ＋
                          </button>
                        </div>

                        <span className="hidden sm:inline mx-2 h-4 w-px bg-gray-300" />

                        <button
                          onClick={() =>
                            setPageNumber((p) => Math.max(1, p - 1))
                          }
                          disabled={pageNumber <= 1}
                          className="px-3 py-1 rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                          title="Pagina precedente"
                        >
                          ←
                        </button>
                        <span className="text-sm">
                          Pagina {Math.min(pageNumber, numPages)} /{" "}
                          {numPages || "—"}
                        </span>
                        <button
                          onClick={() =>
                            setPageNumber((p) => Math.min(numPages, p + 1))
                          }
                          disabled={!numPages || pageNumber >= numPages}
                          className="px-3 py-1 rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                          title="Pagina successiva"
                        >
                          →
                        </button>

                        {/* Cambia file (desktop) + Download */}
                        <div className="hidden sm:flex items-center gap-2">
                          <button
                            onClick={() => {
                              setCurrentIdx((i) => Math.max(0, i - 1));
                              setPageNumber(1);
                            }}
                            disabled={currentIdx === 0}
                            className="px-3 py-1 rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                            title="File precedente"
                          >
                            ‹ File
                          </button>
                          <button
                            onClick={() => {
                              setCurrentIdx((i) =>
                                Math.min(pdfList.length - 1, i + 1)
                              );
                              setPageNumber(1);
                            }}
                            disabled={currentIdx >= pdfList.length - 1}
                            className="px-3 py-1 rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                            title="File successivo"
                          >
                            File ›
                          </button>
                          {currentPdf && (
                            <a
                              href={currentPdf}
                              download
                              className="ml-2 px-3 py-1 rounded bg-sky-600 text-white hover:bg-blue-700"
                            >
                              Scarica
                            </a>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500">
                      {pdfReady
                        ? "Seleziona un PDF dalla lista."
                        : "Preparazione viewer…"}
                    </div>
                  )}
                </div>
              </main>
            </div>
          </div>
        </div>
      )}

      {/* BlackPopup per non abbonati */}
      {showPopup && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowPopup(false)}
        >
          <div
            className="w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <BlackPopup />
          </div>
        </div>
      )}
    </>
  );
}

/* Icons */
function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M6 6l12 12M18 6l-12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
