import Image from "next/image";
import Link from "next/link";
import HeaderClient from "./HeaderClient";

export default function Header() {
  return (
    <header className="sticky px-4 top-3 max-w-screen-xl mx-4 xl:mx-auto mb-6 z-50 rounded-3xl [.dark_&]:bg-slate-800/60 bg-gray-100/60 backdrop-blur-xl border border-neutral-100/60">
      <div className="relative mx-auto flex max-w-screen-xl flex-col py-4 md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
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

        <HeaderClient />
      </div>
    </header>
  );
}
