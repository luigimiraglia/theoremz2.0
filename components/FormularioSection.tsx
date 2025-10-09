"use client";
import { useAuth } from "@/lib/AuthContext";
import { useState, type ComponentType, memo } from "react";
import Icon from "./Icon";
import AnimatedButtonWrapper from "./AnimatedButtonWrapper";

const FormularioSection = memo(function FormularioSection({ url }: { url: string }) {
  const { isSubscribed } = useAuth();
  const [state, setState] = useState<"idle" | "popup">("idle");
  const [Popup, setPopup] = useState<ComponentType | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
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
      <AnimatedButtonWrapper delay={0}>
        <button
          type="button"
          onClick={handleClick}
          className="min-w-0 flex-shrink font-semibold sm:font-bold px-2 sm:px-3 py-1.5 text-xs sm:text-sm shadow-md rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:brightness-110 hover:scale-105 transition-all duration-500 whitespace-nowrap inline-flex items-center gap-0.5 sm:gap-1"
        >
          <Icon name="calculator" size="sm" />
          <span className="truncate">Formulario</span>
        </button>
      </AnimatedButtonWrapper>
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
});

export default FormularioSection;
