import Image from "next/image";

export default function Index() {
  return (
    <>
      <div className="mt-6 bg-gray-100/60 rounded-2xl mx-6 py-3 px-3 justify-center text-center font-bold  xl:mx-auto max-w-screen-xl">
        <h2 className="text-black/90 text-xl md:text-2xl">
          Inizia subito a imparare 👇
        </h2>
        <p className="text-black/90 text-md md:text-lg font-medium">
          Scopri tutti i nostri contenuti
        </p>
      </div>
      <div className="flex flex-col sm:flex-row sm:space-x-3 mt-3 mx-6 xl:mx-auto max-w-screen-xl justify-center space-y-2">
        <div className="rounded-2xl h-fit bg-gray-100/60 py-5 px-auto w-full  border-3 border-blue-800 transition-all duration-100 ease-in-out shadow-none translate-x-0 translate-y-0 hover:shadow-[-5px_6px_0_0_#1e40af,0_0_0_0_#1e40af] hover:translate-x-1 hover:-translate-y-1">
          <div className=" h-40 sm:h-30 md:h-40 lg:h-50 mx-auto w-fit">
            <Image
              alt="matematica"
              src="/math.png"
              height={512}
              width={512}
              className="w-auto h-full"
            />
          </div>
          <div className="text-2xl font-bold text-center">Matematica</div>
        </div>
        <div className="rounded-2xl h-fit bg-gray-100/60 py-5 px-auto w-full  border-3 border-blue-800 transition-all duration-100 ease-in-out shadow-none translate-x-0 translate-y-0 hover:shadow-[-5px_6px_0_0_#1e40af,0_0_0_0_#1e40af] hover:translate-x-1 hover:-translate-y-1">
          <div className="h-40 sm:h-30 md:h-40 lg:h-50 mx-auto w-fit py-3 sm:py-2 lg:py-4">
            <Image
              alt="fisica"
              src="/physics.png"
              height={512}
              width={512}
              className="w-auto h-full"
            />
          </div>
          <div className="text-2xl font-bold text-center">Fisica</div>
        </div>
        <div className="rounded-2xl h-fit bg-gray-100/60 py-5 px-auto w-full  border-3 border-blue-800 transition-all duration-100 ease-in-out shadow-none translate-x-0 translate-y-0 hover:shadow-[-5px_6px_0_0_#1e40af,0_0_0_0_#1e40af] hover:translate-x-1 hover:-translate-y-1">
          <div className="h-40 sm:h-30 md:h-40 lg:h-50 mx-auto w-fit py-2 sm:py-1 lg:py-3">
            <Image
              alt="tutor"
              src="/teacher.png"
              height={512}
              width={512}
              className="w-auto h-full"
            />
          </div>
          <div className="text-2xl font-bold text-center">Tutor</div>
        </div>
      </div>
    </>
  );
}
