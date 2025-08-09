"use client";
import { useAuth } from "@/lib/AuthContext";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import BlackPopup from "@/components/BlackPopup";

export default function WhatsappButton() {
  const { isSubscribed } = useAuth();
  const [state, setState] = useState<"idle" | "popup">("idle");

  const handleClick = () => {
    if (true) window.location.assign("https://wa.me/+393519523641");
    else setState("popup");
  };

  const closePopup = () => setState("idle");

  return (
    <>
      <button
        onClick={handleClick}
        className="fixed flex bottom-4 shadow-xl z-10 sm:bottom-6 right-3 bg-gradient-to-br from-[#02C36A] to-[#17E9B6] hover:from-[#17E9B6] hover:to-[#02C36A] transition-colors ease-in-out duration-300 text-white font-semibold py-2 sm:text-lg sm:py-2 px-3 rounded-xl sm:rounded-2xl"
      >
        <p className="mt-0.4">Fai una domanda</p>
        <Image
          className="ml-2 h-6 w-6 sm:h-6.5 sm:w-6.5"
          alt="whatsapp button"
          width={30}
          height={30}
          src="https://theoremz.com/images/wa.svg"
        />
      </button>

      {state === "popup" && (
        <div
          onClick={closePopup}
          className="fixed inset-0 z-9 backdrop-blur-md flex justify-center items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className=" p-6 rounded-xl max-w-md w-full"
          >
            <BlackPopup />
          </div>
        </div>
      )}
    </>
  );
}
