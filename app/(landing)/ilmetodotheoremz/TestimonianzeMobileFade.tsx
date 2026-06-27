"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type TestimonianzeMobileFadeProps = {
  items: string[];
  horizontalItems?: string[];
};

export default function TestimonianzeMobileFade({
  items,
  horizontalItems,
}: TestimonianzeMobileFadeProps) {
  const [active, setActive] = useState(0);
  const itemCount = items.length;
  const horizontalSet = new Set(horizontalItems ?? []);

  useEffect(() => {
    if (itemCount <= 1) return;

    setActive(0);
    const intervalId = window.setInterval(() => {
      setActive((prev) => (prev + 1) % itemCount);
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [itemCount]);

  if (itemCount === 0) {
    return null;
  }

  return (
    <div className="relative mx-auto w-[90vw]">
      <div className="grid place-items-center">
        {items.map((src, idx) => {
          const isHorizontal = horizontalSet.has(src);
          const size = getTestimonialSize(src);

          return (
            <div
              key={`${src}-${idx}`}
              className={`col-start-1 row-start-1 w-full transition-opacity duration-500 ease-in-out ${
                idx === active ? "opacity-100" : "opacity-0"
              }${isHorizontal ? " h-full rounded-2xl bg-black flex items-center justify-center" : ""}`}
              aria-hidden={idx !== active}
            >
              <Image
                src={src}
                alt="Testimonianza"
                width={size.width}
                height={size.height}
                sizes="90vw"
                className={
                  isHorizontal
                    ? "max-h-full w-full object-contain rounded-2xl"
                    : "h-auto w-full rounded-2xl"
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getTestimonialSize(src: string) {
  switch (src) {
    case "/images/test3.PNG":
      return { width: 739, height: 190 };
    case "/images/test11.jpeg":
      return { width: 739, height: 1600 };
    case "/images/test1.jpeg":
    case "/images/test2.jpeg":
      return { width: 946, height: 2048 };
    default:
      return { width: 1125, height: 2436 };
  }
}
