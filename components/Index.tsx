import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Index() {
  return (
    <>
      <div className="mt-6 bg-gray-100/60 [.dark_&]:bg-slate-800 rounded-2xl mx-6 py-3 px-3 justify-center text-center font-bold xl:mx-auto max-w-screen-xl">
        <h2 className="text-slate-800 [.dark_&]:text-white text-xl md:text-2xl">
          Inizia subito a imparare 👇
        </h2>
        <p className="text-slate-800 [.dark_&]:text-white text-md md:text-lg font-medium">
          Scopri tutti i nostri contenuti
        </p>
        <ThemeToggle />
      </div>

      <div
        className="flex flex-col sm:flex-row sm:space-x-3 mt-3 mx-6 xl:mx-auto max-w-screen-xl justify-center space-y-2"
        style={{ contentVisibility: "auto", containIntrinsicSize: "520px" }} // opzionale se sotto la piega
      >
        <Link href="/matematica" className="w-full">
          <div className="rounded-2xl h-fit [.dark_&]:bg-slate-800 bg-gray-50/95 py-5 w-full border-[2.5px] border-slate-800 transition-all duration-100 ease-in-out shadow-none translate-x-0 translate-y-0 hover:shadow-[-7px_8px_0_0_#2b7fff,0_0_0_0_#2b7fff] hover:translate-x-1 hover:-translate-y-1">
            <div className="h-40 mx-auto w-fit">
              <Image
                alt="matematica"
                src="/images/math.png"
                width={512}
                height={512}
                className="w-auto h-full"
                loading="lazy"
                sizes="(max-width: 640px) 70vw, (max-width: 1024px) 33vw, 320px"
              />
            </div>
            <div className="text-2xl font-bold text-slate-900 text-center [.dark_&]:text-white">
              Matematica
            </div>
          </div>
        </Link>

        <Link href="/fisica" className="w-full">
          <div className="rounded-2xl h-fit [.dark_&]:bg-slate-800 bg-gray-50/95 py-5 w-full border-[2.5px] border-slate-800 transition-all duration-100 ease-in-out shadow-none translate-x-0 translate-y-0 hover:shadow-[-7px_8px_0_0_#2b7fff,0_0_0_0_#2b7fff] hover:translate-x-1 hover:-translate-y-1">
            <div className="h-40 mx-auto w-fit py-3">
              <Image
                alt="fisica"
                src="/images/physics.png"
                width={512}
                height={512}
                className="w-auto h-full"
                loading="lazy"
                sizes="(max-width: 640px) 70vw, (max-width: 1024px) 33vw, 320px"
              />
            </div>
            <div className="text-2xl font-bold text-center text-slate-900 [.dark_&]:text-white">
              Fisica
            </div>
          </div>
        </Link>

        <Link href="/mentor" className="w-full">
          <div className="rounded-2xl h-fit bg-gray-50/95 [.dark_&]:bg-slate-800 py-5 w-full border-[2.5px] border-slate-800 transition-all duration-100 ease-in-out shadow-none translate-x-0 translate-y-0 hover:shadow-[-7px_8px_0_0_#2b7fff,0_0_0_0_#2b7fff] hover:translate-x-1 hover:-translate-y-1">
            <div className="h-40 mx-auto w-fit py-2">
              <Image
                alt="tutor"
                src="/images/teacher.png"
                width={512}
                height={512}
                className="w-auto h-full"
                loading="lazy"
                sizes="(max-width: 640px) 70vw, (max-width: 1024px) 33vw, 320px"
              />
            </div>
            <div className="text-2xl font-bold text-center text-slate-900 [.dark_&]:text-white">
              Tutor
            </div>
          </div>
        </Link>
      </div>
    </>
  );
}
