// components/SocialProof.tsx  (SERVER, niente "use client")
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
        <div className="flex flex-row opacity-80 gap-2 text-4xl mx-auto w-fit mt-2 text-slate-900 [.dark_&]:text-white">
          👩🏼‍🎓👨🏻‍🎓👩🏽‍🎓
        </div>
      </div>

      {/* Divider */}
      <hr className="w-[90%] h-0.5 bg-gray-500 border-0 rounded-full opacity-80 mx-auto sm:w-0.5 sm:h-40 sm:mx-0 sm:my-4" />

      {/* Like e commenti */}
      <div className="sm:basis-1/3 sm:mx-4 sm:my-auto">
        <p>
          <span className="text-blue-500">330K+</span> like e commenti positivi
        </p>
        <span className="text-3xl">💬</span>
      </div>

      {/* Divider */}
      <hr className="w-[90%] h-0.5 bg-gray-500 border-0 rounded-full opacity-80 mx-auto sm:w-0.5 sm:h-40 sm:mx-0 sm:my-4" />

      {/* Recensione */}
      <div className="sm:basis-1/3 sm:mx-4 sm:my-auto">
        <p className="italic">
          &quot;Theoremz mi ha salvato la vita, grazie ragazzi&quot;
        </p>
        <div className="flex text-3xl justify-center mt-2 gap-1 text-yellow-400">
          ⭐️⭐️⭐️⭐️⭐️
        </div>
      </div>
    </section>
  );
}
