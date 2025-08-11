// HeroImage.tsx (SERVER)
import Image from "next/image";

export default function HeroImage() {
  return (
    <div className="w-full">
      {/* mantiene la ratio e riserva spazio */}
      <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
        <Image
          src="/images/wimage.webp"
          alt="welcome image"
          // dimensioni "reali" dell’asset (esporta a 1200x1200 o 1024x1024)
          width={2870}
          height={2378}
          priority
          fetchPriority="high"
          sizes="(max-width: 768px) 100vw, 50vw"
          // fa occupare 100% del wrapper senza ricalcolare layout
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    </div>
  );
}
