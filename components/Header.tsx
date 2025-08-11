"use client";

import Image from "next/image";
import Link from "next/link";
import AccountButton from "./AccountButton";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function Header() {
  const pathname = usePathname();

  // Chiude il menu ogni volta che cambia pagina
  useEffect(() => {
    const checkbox = document.getElementById(
      "navbar-open"
    ) as HTMLInputElement | null;
    if (checkbox) checkbox.checked = false;
  }, [pathname]);

  // Funzione da chiamare su click dei link
  const handleLinkClick = () => {
    const checkbox = document.getElementById("navbar-open") as HTMLInputElement;
    if (checkbox) checkbox.checked = false;
  };

  return (
    <header className="sticky px-4 top-3 max-w-screen-xl mx-4 xl:mx-auto mb-6 z-50 rounded-3xl [.dark_&]:bg-slate-800/60 bg-gray-100/60 backdrop-blur-xl border border-neutral-100/60">
      <div className="relative mx-auto flex max-w-screen-xl flex-col py-4 md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          onClick={handleLinkClick}
          className="flex items-center text-xl font-bold opacity-85"
        >
          <Image
            src="/images/logo.png"
            alt="logo"
            width={1024}
            height={1024}
            className="rounded-lg h-10 w-10"
          />
          <span className="ml-2 ">
            <p className="text-slate-900 [.dark_&]:text-white">Theoremz</p>
          </span>
        </Link>

        <input type="checkbox" id="navbar-open" className="peer hidden" />

        <label
          htmlFor="navbar-open"
          className="absolute right-2 mt-3 cursor-pointer text-xl md:hidden"
        >
          <span className="sr-only">Toggle Navigation</span>
          <svg
            className="[.dark_&]:fill-white"
            xmlns="http://www.w3.org/2000/svg"
            width="0.88em"
            height="1em"
            viewBox="0 0 448 512"
            fill="black"
          >
            <path d="M0 96c0-17.7 14.3-32 32-32h384c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zm0 160c0-17.7 14.3-32 32-32h384c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zm448 160c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32h384c17.7 0 32 14.3 32 32z" />
          </svg>
        </label>

        <nav
          aria-label="Header Navigation"
          className="hidden peer-checked:block pl-2 py-6 md:block md:py-0 font-semibold font-stretch-100%"
        >
          <ul className="flex flex-col items-center gap-y-4 md:flex-row md:gap-x-8">
            <li>
              <Link
                href="/"
                onClick={handleLinkClick}
                className="text-gray-800 [.dark_&]:text-white hover:text-blue-500 transition-colors duration-250 ease-in-out delay-50"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/matematica"
                onClick={handleLinkClick}
                className="text-gray-800 [.dark_&]:text-white hover:text-blue-500 transition-colors duration-250 ease-in-out delay-50"
              >
                Matematica
              </Link>
            </li>
            <li>
              <Link
                href="/fisica"
                onClick={handleLinkClick}
                className="text-gray-800 [.dark_&]:text-white hover:text-blue-500 transition-colors duration-250 ease-in-out delay-50"
              >
                Fisica
              </Link>
            </li>
            <li>
              <Link
                href="/esercizi"
                onClick={handleLinkClick}
                className="text-gray-800 [.dark_&]:text-white hover:text-blue-500 transition-colors duration-250 ease-in-out delay-50"
              >
                Esercizi
              </Link>
            </li>
            <li className="mt-2 sm:mt-0">
              <AccountButton />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
