import Image from "next/image";

export default function SocialProof() {
  return (
    <div className="flex flex-col sm:flex-row bg-gray-100/60 rounded-2xl mx-6 py-8 sm:py-4 px-3 justify-center text-center text-black/75 text-lg font-bold sm:text-xl xl:text-2xl space-y-4 xl:mx-auto max-w-screen-xl">
      <div className="sm:w-3/10 sm:mx-4 sm:my-auto">
        <p>
          <span className="text-blue-500">35K+</span> studenti iscritti
        </p>
        <div className="flex flex-row opacity-80 space-x-1 mx-auto w-fit mt-1">
          <Image
            className="h-8 w-8"
            alt="studenti iscritti"
            src="/user.webp"
            width={512}
            height={512}
          />
          <Image
            className="h-8 w-8"
            alt="studenti iscritti"
            src="/user.webp"
            width={512}
            height={512}
          />
          <Image
            className="h-8 w-8"
            alt="studenti iscritti"
            src="/user.webp"
            width={512}
            height={512}
          />
        </div>
      </div>
      <hr className="w-[90%] h-0.5  bg-gray-500 border-0 rounded-full opacity-80 mx-auto sm:w-0.5 sm:h-40 sm:mx-0 sm:my-4" />
      <div className="sm:w-3/10 sm:mx-4 sm:my-auto">
        <p>
          <span className="text-blue-500">330K+</span> like e commenti positivi
        </p>
        <Image
          className="h-11 w-11 mx-auto mt-1"
          alt="like e commenti"
          src="/chat.webp"
          width={512}
          height={512}
        />
      </div>
      <hr className="w-[90%] h-0.5  bg-gray-500 border-0 rounded-full opacity-80 mx-auto sm:w-0.5 sm:h-40 sm:mx-0 sm:my-4" />
      <div className="sm:w-3/10 sm:mx-4 sm:my-auto">
        <p>&quot;Theoremz mi ha salvato la vita, grazie ragazzi&quot;</p>
        <Image
          className="w-32 mx-auto mt-1"
          alt="recensione"
          src="/rating.webp"
          width={96}
          height={512}
        />
      </div>
    </div>
  );
}
