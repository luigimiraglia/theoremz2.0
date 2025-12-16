import Image from "next/image";
import Link from "next/link";

export default function BlackPopup() {
  return (
    <div className="flex z-100 flex-col gap-3 bg-[#f8fafc] [.dark_&]:text-black border-10 border-white fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-2xl pt-4 pb-4 text-center drop-shadow-xl shadow drop-shadow-blue-100 w-80 [.dark_&]:shadow-[0_16px_50px_rgba(0,0,0,0.7)] [.dark_&]:drop-shadow-none">
      <h1 className="text-xl font-bold mx-8">
        Hai scoperto un vantaggio Black
      </h1>
      <p className="font-medium mx-4">
        Iscriviti per accedere a questa e tutte le altre funzioni esclusive
      </p>
      <ul className="pl-12">
        <li className="flex">
          <span className="bg-emerald-400 text-white rounded-full h-[22px] w-[22px] mr-1.5">
            <svg
              height="18"
              width="18"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              className="mt-0.5 ml-[1.5px]"
            >
              <path d="M0 0h24v24H0z" fill="none"></path>
              <path
                fill="currentColor"
                d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"
              ></path>
            </svg>
          </span>
          <span className="h-10">
            Insegnante <strong>dedicato</strong>
          </span>
        </li>
        <li className="flex">
          <span className="bg-emerald-400 text-white rounded-full h-[22px] w-[22px] mr-1.5">
            <svg
              height="18"
              width="18"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              className="mt-0.5 ml-[1.5px]"
            >
              <path d="M0 0h24v24H0z" fill="none"></path>
              <path
                fill="currentColor"
                d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"
              ></path>
            </svg>
          </span>
          <span className="h-10">
            <strong>3000+</strong> esercizi risolti
          </span>
        </li>
        <li className="flex ">
          <span className="bg-emerald-400 text-white rounded-full h-[22px] w-[22px] mr-1.5">
            <svg
              height="18"
              width="18"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              className="mt-0.5 ml-[1.5px]"
            >
              <path d="M0 0h24v24H0z" fill="none"></path>
              <path
                fill="currentColor"
                d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"
              ></path>
            </svg>
          </span>
          <span className="h-10">Tanto altro ancora</span>
        </li>
      </ul>
      <Link
        href="/black"
        className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-black to-gray-900 font-bold py-3 px-6 rounded-lg text-white mx-4 mt-2 hover:from-gray-800 hover:via-gray-900 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 active:scale-95 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] before:animate-[shimmer_2s_infinite] before:skew-x-12"
      >
        <span className="relative z-10 inline-flex items-center gap-2">
          <Image
            alt="Icona razzo"
            src="/images/rocket.webp"
            width={26}
            height={26}
            className="inline-block h-[1.15em] w-[1.15em] translate-y-[1px]"
          />
          <span>Sblocca tutto ora!</span>
        </span>
      </Link>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(12deg);
          }
          100% {
            transform: translateX(200%) skewX(12deg);
          }
        }
      `}</style>
    </div>
  );
}
