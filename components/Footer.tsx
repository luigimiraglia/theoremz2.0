/* eslint-disable @next/next/no-img-element */
// components/Footer.tsx  (SERVER)
import Image from "next/image";
import Link from "next/link";
import ConsentManagerLink from "./ConsentManagerLink";
export default function Footer() {
  return (
    <footer
      className="w-full border-t border-slate-800 bg-slate-950 text-slate-300"
      style={{ contentVisibility: "auto", containIntrinsicSize: "420px" }}
    >
      <div className="mx-auto max-w-screen-xl px-5 py-10 sm:px-8 lg:py-12">
        <div className="grid gap-9 border-b border-white/10 pb-9 lg:grid-cols-[1.35fr_1fr_1fr]">
          <div className="max-w-xl">
            <Link href="/" className="inline-flex items-center gap-2 text-white">
              <Image
                src="/images/logo-80.webp"
                alt="Logo Theoremz"
                width={36}
                height={36}
                className="h-9 w-9 rounded-xl object-contain shadow-lg shadow-blue-950/30"
              />
              <span className="text-xl font-black tracking-tight">Theoremz</span>
            </Link>
            <p className="mt-4 max-w-md text-sm font-medium leading-6 text-slate-400">
              Lezioni, esercizi, formulari e strumenti per studiare matematica
              e fisica senza perdere tempo tra fonti sparse.
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              P. IVA 17675281004
            </p>
          </div>

          <nav aria-label="Link principali">
            <h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-white">
              Studia
            </h2>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-400">
              <Link href="/lezioni" className="transition hover:text-blue-300">
                Lista delle lezioni
              </Link>
              <Link href="/calcolatori" className="transition hover:text-blue-300">
                Calcolatori
              </Link>
              <Link href="/black" className="transition hover:text-blue-300">
                Theoremz Black
              </Link>
              <Link href="/chisiamo" className="transition hover:text-blue-300">
                Chi siamo
              </Link>
            </div>
          </nav>

          <nav aria-label="Informazioni legali">
            <h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-white">
              Informazioni
            </h2>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-400">
              <Link href="/privacy-policy" className="transition hover:text-blue-300">
                Privacy Policy
              </Link>
              <Link href="/cookie-policy" className="transition hover:text-blue-300">
                Cookie Policy
              </Link>
              <Link href="/termini-di-servizio" className="transition hover:text-blue-300">
                Termini e condizioni
              </Link>
              <ConsentManagerLink className="text-left transition hover:text-blue-300" />
            </div>
          </nav>
        </div>

        <div className="flex flex-col gap-6 pt-7 md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap items-center gap-3" aria-label="Contatti social">
            <li>
              <a
                href="https://wa.me/+393519523641"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/15"
                title="Whatsapp"
              >
                <img src="/images/wa.svg" alt="Whatsapp" width={20} height={20} loading="lazy" />
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/theoremz__/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/15"
                title="Instagram"
              >
                <img src="/images/insta.webp" alt="Instagram" width={20} height={20} loading="lazy" />
              </a>
            </li>
            <li>
              <a
                href="https://www.tiktok.com/@theoremz_"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/15"
                title="Tiktok"
              >
                <img src="/images/tiktok.svg" alt="Tiktok" width={20} height={20} loading="lazy" />
              </a>
            </li>
            <li>
              <a
                href="mailto:theoremz.team@gmail.com"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/15"
                title="Email"
              >
                <img src="/images/mail.svg" alt="Email" width={20} height={20} loading="lazy" />
              </a>
            </li>
          </ul>

          <p className="max-w-xl text-sm font-medium leading-6 text-slate-400 md:text-right">
            Sviluppato e scritto da matematici e fisici italiani, con cura sui
            contenuti e sugli strumenti di studio.{" "}
            <Image
              alt="Icona cuore"
              src="/images/heart.webp"
              width={18}
              height={18}
              className="inline-block h-[1.1em] w-[1.1em] translate-y-[2px]"
            />
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Theoremz. Tutti i diritti riservati.</p>
          <a href="mailto:theoremz.team@gmail.com" className="transition hover:text-blue-300">
            theoremz.team@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}
