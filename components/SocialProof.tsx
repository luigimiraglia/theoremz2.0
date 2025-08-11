"use client";

import { FaUserGraduate, FaCommentDots, FaStar } from "react-icons/fa";

export default function SocialProof() {
  return (
    <div className="flex flex-col sm:flex-row bg-gray-100/60 [.dark_&]:bg-slate-800 rounded-2xl mx-6 py-8 sm:py-4 px-3 justify-center text-center text-black/75 [.dark_&]:text-white text-lg font-bold sm:text-xl xl:text-2xl space-y-4 xl:mx-auto max-w-screen-xl">
      {/* Studenti */}
      <div className="sm:w-3/10 sm:mx-4 sm:my-auto">
        <p>
          <span className="text-blue-500">35K+</span> studenti iscritti
        </p>
        <div className="flex flex-row opacity-80 space-x-2 mx-auto w-fit mt-2">
          <FaUserGraduate className="h-8 w-8 text-slate-900 [.dark_&]:text-white" />
          <FaUserGraduate className="h-8 w-8 text-slate-900 [.dark_&]:text-white" />
          <FaUserGraduate className="h-8 w-8 text-slate-900 [.dark_&]:text-white" />
        </div>
      </div>

      {/* Divider */}
      <hr className="w-[90%] h-0.5 bg-gray-500 border-0 rounded-full opacity-80 mx-auto sm:w-0.5 sm:h-40 sm:mx-0 sm:my-4" />

      {/* Like e commenti */}
      <div className="sm:w-3/10 sm:mx-4 sm:my-auto">
        <p>
          <span className="text-blue-500">330K+</span> like e commenti positivi
          💬
        </p>
      </div>

      {/* Divider */}
      <hr className="w-[90%] h-0.5 bg-gray-500 border-0 rounded-full opacity-80 mx-auto sm:w-0.5 sm:h-40 sm:mx-0 sm:my-4" />

      {/* Recensione */}
      <div className="sm:w-3/10 sm:mx-4 sm:my-auto">
        <p>&quot;Theoremz mi ha salvato la vita, grazie ragazzi&quot;</p>
        <div className="flex justify-center mt-2 space-x-1 text-yellow-400">
          <FaStar className="h-8 w-8" />
          <FaStar className="h-8 w-8" />
          <FaStar className="h-8 w-8" />
          <FaStar className="h-8 w-8" />
          <FaStar className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}
