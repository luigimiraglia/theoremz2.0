export default function BlackPopup() {
  return (
    <div className="flex z-100 flex-col gap-3 bg-[#f8fafc] [.dark_&]:text-black border-10 border-white fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-2xl pt-4 pb-4 text-center drop-shadow-xl shadow drop-shadow-blue-100 w-80 ">
      <h1 className="text-xl font-bold mx-8">
        Hai scoperto un vantaggio Black
      </h1>
      <p className="font-medium mx-4">
        Iscriviti per usifruire di questa e molte altre funzioni esclusive
      </p>
      <ul className="pl-15">
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
            <strong>Niente</strong> pubblicità
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
            Assistenza <strong>illimitata</strong>
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
      <button className="bg-black font-bold py-2 rounded-lg text-white mx-4 mt-2">
        Scopri di più
      </button>
    </div>
  );
}
