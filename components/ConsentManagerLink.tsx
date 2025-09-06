"use client";

export default function ConsentManagerLink({ className }: { className?: string }) {
  return (
    <button
      className={className || "hover:text-blue-400"}
      onClick={() => {
        try {
          window.dispatchEvent(new Event("tz:open-cookie-manager"));
        } catch {}
      }}
    >
      Preferenze Cookie
    </button>
  );
}

