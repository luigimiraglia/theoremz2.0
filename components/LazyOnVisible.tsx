"use client";

import { useEffect, useRef, useState } from "react";

type AnyProps = Record<string, any>;
type ComponentId =
  | "LessonIndex"
  | "VideoSection"
  | "LessonExercises"
  | "CategoryBlock";

export default function LazyOnVisible({
  component,
  props,
  rootMargin = "200px",
  minHeight,
}: {
  component: ComponentId;
  props?: AnyProps;
  rootMargin?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [Mod, setMod] = useState<any>(null);

  useEffect(() => {
    if (!ref.current || visible) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  useEffect(() => {
    if (!visible || Mod) return;
    let mounted = true;
    const load = async () => {
      let m: any;
      switch (component) {
        case "LessonIndex":
          m = await import("@/components/LessonIndex");
          break;
        case "VideoSection":
          m = await import("@/components/VideoSection");
          break;
        case "LessonExercises":
          m = await import("@/components/LessonExercises");
          break;
        case "CategoryBlock":
          m = await import("@/components/CategoryBlock");
          break;
        default:
          m = null;
      }
      if (mounted) setMod(() => (m ? m.default ?? m : null));
    };
    load();
    return () => {
      mounted = false;
    };
  }, [visible, Mod, component]);

  return (
    <div ref={ref} style={!Mod && minHeight ? { minHeight } : undefined}>
      {Mod ? <Mod {...(props || {})} /> : null}
    </div>
  );
}
