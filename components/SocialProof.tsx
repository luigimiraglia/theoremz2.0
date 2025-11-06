// components/SocialProof.tsx  (SERVER, niente "use client")
import Image from "next/image";
import { FaHeart, FaStar, FaCommentDots } from "react-icons/fa";

export default function SocialProof() {
  return (
    <section
      className="flex flex-col sm:flex-row bg-gray-100/60 [.dark_&]:bg-slate-800 rounded-2xl mx-6 py-8 sm:py-4 px-3 justify-center text-center text-black/75 [.dark_&]:text-white text-lg font-bold sm:text-xl xl:text-2xl space-y-4 xl:mx-auto max-w-screen-xl"
      style={{ contentVisibility: "auto", containIntrinsicSize: "300px" }} // opzionale: sezione sotto la piega
    >
      {/* Studenti */}
      <div className="sm:basis-1/3 sm:mx-4 sm:my-auto">
        <p>
          <span className="text-blue-500">45K+</span> studenti iscritti
        </p>
        <div className="flex flex-row opacity-90 gap-1.5 mx-auto w-fit mt-2">
          {[
            "test-student1.webp",
            "test-student2.webp",
            "test-student3.webp",
          ].map((img, idx) => (
            <Image
              key={img}
              src={`/images/${img}`}
              alt={`Studente ${idx + 1}`}
              width={48}
              height={48}
              className="h-10 w-10 "
              priority={idx === 0}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <hr className="w-[90%] h-0.5 bg-gray-500 border-0 rounded-full opacity-80 mx-auto sm:w-0.5 sm:h-40 sm:mx-0 sm:my-4" />

      {/* Like e commenti */}
      <div className="sm:basis-1/3 sm:mx-4 sm:my-auto">
        <p>
          <span className="text-blue-500">330K+</span> like e commenti positivi
        </p>
        <span className="mt-2 flex items-center justify-center gap-3">
          <FaHeart className="h-9 w-9 text-white" aria-hidden />
          <FaCommentDots className="h-9 w-9 text-white" aria-hidden />
        </span>
      </div>

      {/* Divider */}
      <hr className="w-[90%] h-0.5 bg-gray-500 border-0 rounded-full opacity-80 mx-auto sm:w-0.5 sm:h-40 sm:mx-0 sm:my-4" />

      {/* Recensione */}
      <div className="sm:basis-1/3 sm:mx-4 sm:my-auto">
        <p className="italic">
          &quot;Theoremz mi ha salvato la vita, grazie ragazzi&quot;
        </p>
        <div className="flex text-3xl justify-center mt-2 gap-1 text-yellow-400">
          {Array.from({ length: 5 }).map((_, idx) => (
            <FaStar
              key={idx}
              className="h-7 w-7 text-amber-300"
              aria-hidden
            />
          ))}
        </div>
      </div>
    </section>
  );
}
