"use client";

import Image from "next/image";
import Link from "next/link";

export default function TutorHero() {
  const inlineMemo = (
    <Image
      alt="Icona appunti"
      src="/images/memo.webp"
      width={20}
      height={20}
      className="align-middle inline-block h-[1.1em] w-[1.1em] translate-y-[1px]"
    />
  );

  return (
    <section className="mx-6 my-6 max-w-screen-xl xl:mx-auto rounded-[24px] bg-gray-100/60 [.dark_&]:bg-slate-800 px-4 pb-6 sm:px-6 sm:pb-10 lg:px-8">
      <div className="flex flex-col-reverse md:flex-row md:items-center md:gap-8">
        {/* Testo */}
        <div className="flex-1 md:pt-8">
          <h2 className="text-[28px] sm:text-[30px] font-bold leading-tight text-sky-600">
            Tutor dedicato
          </h2>
          <p className="text-[28px] sm:text-[30px] font-bold leading-tight text-slate-900 [.dark_&]:text-white">
            per ogni studente{" "}
            <Image
              alt="Icona persona al computer"
              src="/images/man-pc.webp"
              width={28}
              height={28}
              className="align-middle inline-block h-[1.2em] w-[1.2em]"
            />
          </p>

          <p className="mt-2 text-[18px] sm:text-[19px] font-semibold text-rose-500">
            Serve un supporto dedicato?
          </p>
          <p className="text-[17px] sm:text-[18px] font-medium leading-relaxed text-slate-700 [.dark_&]:text-white">
            Scopri i nostri percorsi! Gli studenti sono guidati a 360° da un
            insegnante esperto per raggiungere i loro obiettivi scolastici{" "}
            {inlineMemo}
          </p>

          {/* CTA */}
          <div className="mt-4">
            <Link
              href="/ilmetodotheoremz"
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
            </Link>
          </div>
        </div>

        {/* Illustrazione (SVG animata) */}
        <div className="flex-1 mt-8 md:mt-0">
          <div className="rounded-2xl [.dark_&]:bg-slate-800">
            <div className="mx-auto max-w-[520px]">
              <Image
                alt="tutor"
                src="/images/rip-img.svg"
                height={300}
                width={400}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
