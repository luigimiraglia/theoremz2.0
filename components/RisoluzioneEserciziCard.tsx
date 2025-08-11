"use client";

import { useRef } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

export default function RisoluzioneEserciziCard() {
  return (
    <section className="mx-6 my-6 max-w-screen-xl md:pt-2 xl:mx-auto rounded-[24px] bg-gray-100/60 [.dark_&]:bg-slate-800 px-4 pb-6 sm:px-6 sm:pb-10 lg:px-8">
      <div className="flex flex-col-reverse md:flex-row-reverse md:items-center md:gap-8">
        {/* Testo */}
        <div className="flex-1 md:pt-8">
          <h2 className="text-[28px] sm:text-[30px] font-bold leading-tight text-sky-600">
            Risoluzione esercizi
          </h2>
          <p className="text-[28px] sm:text-[30px] font-bold leading-tight text-slate-900 [.dark_&]:text-white">
            online e immediata <span className="align-middle">👨‍💻</span>
          </p>

          <p className="mt-2 text-[18px] sm:text-[19px] font-semibold text-rose-500">
            Non capisci un esercizio?
          </p>
          <p className="text-[17px] sm:text-[18px] font-medium leading-relaxed text-slate-700 [.dark_&]:text-white">
            Invialo a noi! Lo risolviamo immediatamente per te e ti forniamo una
            spiegazione dettagliata <span className="align-middle">📝</span>
          </p>

          {/* CTA */}
          <div className="mt-4">
            <a
              href="#"
              className="inline-flex items-center justify-center rounded-2xl w-full md:w-fit bg-blue-600 px-7 py-4 text-[18px] font-extrabold text-white shadow-[0_6px_0_#1d4ed8] transition active:translate-y-[1px] active:shadow-[0_5px_0_#1d4ed8]"
            >
              Scopri di più
              <svg
                className="ml-2 h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>

        {/* Animazione */}
        <div className="flex-1 mt-8 md:mt-0">
          <div className="rounded-2xl bg-gray-100/60 [.dark_&]:bg-slate-800">
            <div className="mx-auto max-w-[520px]">
              <LottieEnvelope />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Lottie envelope/plane (hover = accelera) --------- */
function LottieEnvelope() {
  const ref = useRef<LottieRefCurrentProps>(null);

  return (
    <div
      onMouseEnter={() => ref.current?.setSpeed(1.6)}
      onMouseLeave={() => ref.current?.setSpeed(1)}
      className="relative"
    >
      <Lottie
        lottieRef={ref}
        loop
        autoplay
        className="h-[220px] sm:h-[280px] w-full"
        // Sostituisci con il path corretto del tuo JSON
        animationData={require("@/public/animations/sending-plane.json")}
      />
    </div>
  );
}
