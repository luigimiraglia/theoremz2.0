// components/SocialProof.tsx  (SERVER, niente "use client")
export default function SocialProof() {
  const IconUser = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5m0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5"
      />
    </svg>
  );
  const Star = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="m12 17.27l6.18 3.73l-1.64-7.03L21 9.24l-7.19-.61L12 2L10.19 8.63L3 9.24l4.46 4.73L5.82 21z"
      />
    </svg>
  );

  return (
    <section
      className="flex flex-col sm:flex-row bg-gray-100/60 [.dark_&]:bg-slate-800 rounded-2xl mx-6 py-8 sm:py-4 px-3 justify-center text-center text-black/75 [.dark_&]:text-white text-lg font-bold sm:text-xl xl:text-2xl space-y-4 xl:mx-auto max-w-screen-xl"
      style={{ contentVisibility: "auto", containIntrinsicSize: "300px" }} // opzionale: sezione sotto la piega
    >
      {/* Studenti */}
      <div className="sm:basis-1/3 sm:mx-4 sm:my-auto">
        <p>
          <span className="text-blue-500">35K+</span> studenti iscritti
        </p>
        <div className="flex flex-row opacity-80 gap-2 mx-auto w-fit mt-2 text-slate-900 [.dark_&]:text-white">
          <IconUser />
          <IconUser />
          <IconUser />
        </div>
      </div>

      {/* Divider */}
      <hr className="w-[90%] h-0.5 bg-gray-500 border-0 rounded-full opacity-80 mx-auto sm:w-0.5 sm:h-40 sm:mx-0 sm:my-4" />

      {/* Like e commenti */}
      <div className="sm:basis-1/3 sm:mx-4 sm:my-auto">
        <p>
          <span className="text-blue-500">330K+</span> like e commenti positivi
          💬
        </p>
      </div>

      {/* Divider */}
      <hr className="w-[90%] h-0.5 bg-gray-500 border-0 rounded-full opacity-80 mx-auto sm:w-0.5 sm:h-40 sm:mx-0 sm:my-4" />

      {/* Recensione */}
      <div className="sm:basis-1/3 sm:mx-4 sm:my-auto">
        <p>&quot;Theoremz mi ha salvato la vita, grazie ragazzi&quot;</p>
        <div className="flex justify-center mt-2 gap-1 text-yellow-400">
          <Star />
          <Star />
          <Star />
          <Star />
          <Star />
        </div>
      </div>
    </section>
  );
}
