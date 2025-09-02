"use client";

import { useEffect, useRef, useState } from "react";

type AnyProps = Record<string, any>;

export default function LazyOnVisible({
  loader,
  props,
  rootMargin = "200px",
  minHeight,
}: {
  loader: () => Promise<any>;
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
    loader().then((m) => {
      if (!mounted) return;
      setMod(() => m.default ?? m);
    });
    return () => {
      mounted = false;
    };
  }, [visible, Mod, loader]);

  return (
    <div ref={ref} style={!Mod && minHeight ? { minHeight } : undefined}>
      {Mod ? <Mod {...(props || {})} /> : null}
    </div>
  );
}

