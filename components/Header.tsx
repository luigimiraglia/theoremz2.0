import Image from "next/image";
import Link from "next/link";
import HeaderClient from "./HeaderClient";

export default function Header() {
  return (
    <header
      id="site-header" // ⬅️ ancora per il banner
      data-floating-anchor="" // ⬅️ opzionale, utile se cambi selettore
      className="fixed top-3 left-1/2 z-50 w-[calc(100%-1rem)] max-w-screen-xl -translate-x-1/2 px-4 rounded-3xl [.dark_&]:bg-slate-800/60 bg-gray-100/70 backdrop-blur-xl border border-white/60 shadow-lg"
    >
      <div className="relative mx-auto flex max-w-screen-xl flex-col py-4 md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          className="flex items-center text-xl font-bold opacity-85"
        >
          <Image
            src="/images/logo.webp"
            alt="logo"
            width={40}
            height={40}
            className="rounded-lg h-10 w-10"
            sizes="40px"
            priority
          />
          <span className="ml-2 ">
            <p className="text-slate-900 [.dark_&]:text-white">Theoremz</p>
          </span>
        </Link>

        <HeaderClient />
      </div>
    </header>
  );
}
