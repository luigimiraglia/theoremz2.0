"use client";

type PrintButtonProps = {
  downloadUrl?: string;
};

export default function PrintButton({ downloadUrl }: PrintButtonProps) {
  const label = downloadUrl ? "Scarica PDF" : "Stampa";

  if (downloadUrl) {
    return (
      <a
        href={downloadUrl}
        download
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 20px",
          borderRadius: "999px",
          background: "linear-gradient(135deg, #4f7cff, #30d5c8)",
          color: "white",
          fontWeight: 800,
          fontSize: "0.92rem",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 8px 28px rgba(79,124,255,0.38)",
          fontFamily: "inherit",
          textDecoration: "none",
        }}
        aria-label={label}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15V3m0 12-4-4m4 4 4-4"/>
          <path d="M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17"/>
        </svg>
        {label}
      </a>
    );
  }

  return (
    <button
      onClick={() => window.print()}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 20px",
        borderRadius: "999px",
        background: "linear-gradient(135deg, #4f7cff, #30d5c8)",
        color: "white",
        fontWeight: 800,
        fontSize: "0.92rem",
        border: "none",
        cursor: "pointer",
        boxShadow: "0 8px 28px rgba(79,124,255,0.38)",
        fontFamily: "inherit",
      }}
      aria-label={label}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15V3m0 12-4-4m4 4 4-4"/>
        <path d="M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17"/>
      </svg>
      {label}
    </button>
  );
}
