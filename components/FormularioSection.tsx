"use client";
import { useAuth } from "@/lib/AuthContext";
import { useState } from "react";

export default function FormularioSection({ url }: { url: string }) {
  const { isSubscribed } = useAuth();
  const [state, setState] = useState<"idle" | "popup">("idle");
  const [Popup, setPopup] = useState<null | ((props: any) => JSX.Element)>(null);

  const handleClick = async () => {
    if (isSubscribed) {
      window.location.assign(url);
      return;
    }
    if (!Popup) {
      const mod = await import("@/components/BlackPopup");
      setPopup(() => mod.default ?? mod);
    }
    setState("popup");
  };

  const closePopup = () => setState("idle");

  return (
    <>
      <button
        onClick={handleClick}
        className=" font-semibold px-2  text-[14px] sm:text-base shadow-md rounded-md [.dark_&]:text-white [.dark_&]:bg-slate-800 bg-gray-100 border-2  mr-1"
      >
        Formulario
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
            {Popup ? <Popup /> : null}
          </div>
        </div>
      )}
    </>
  );
}
