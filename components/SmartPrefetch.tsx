"use client";
import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SmartPrefetchProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  priority?: "low" | "medium" | "high";
  delay?: number;
  hoverOnly?: boolean;
}

export default function SmartPrefetch({
  href,
  children,
  className,
  priority = "low",
  delay = 500,
  hoverOnly = true,
}: SmartPrefetchProps) {
  const router = useRouter();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const prefetchedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Intelligente: prefetch solo se:
  // 1. Connessione non è slow-2g
  // 2. saveData non è attivo
  // 3. Non siamo su mobile con batteria scarica
  const shouldPrefetch = () => {
    if (typeof navigator === "undefined") return false;

    // Check connection quality
    const connection = (navigator as any).connection;
    if (connection) {
      // Non prefetchare su connessioni lente
      if (
        connection.effectiveType === "slow-2g" ||
        connection.effectiveType === "2g"
      ) {
        return false;
      }
      // Rispetta la preferenza saveData dell'utente
      if (connection.saveData) {
        return false;
      }
    }

    // Check battery status (se disponibile)
    const battery = (navigator as any).getBattery?.();
    if (battery) {
      battery.then((battery: any) => {
        // Non prefetchare se batteria < 20% e in carica
        if (battery.level < 0.2 && !battery.charging) {
          return false;
        }
      });
    }

    return true;
  };

  const doPrefetch = useCallback(() => {
    if (prefetchedRef.current || !shouldPrefetch()) return;

    prefetchedRef.current = true;

    // Usa router.prefetch di Next.js che è già ottimizzato
    // Non fa richieste duplicate e usa il cache appropriato
    router.prefetch(href);
  }, [router, href]);

  const handleMouseEnter = () => {
    if (!hoverOnly && prefetchedRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      doPrefetch();
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleClick = () => {
    // Cancella eventuali prefetch in corso al click
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    // Auto-prefetch per link ad alta priorità (solo in viewport)
    if (priority === "high" && !hoverOnly) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setTimeout(() => doPrefetch(), delay);
              observer.disconnect();
            }
          });
        },
        {
          rootMargin: "50px", // Prefetch quando è vicino al viewport
          threshold: 0.1,
        }
      );

      if (linkRef.current) {
        observer.observe(linkRef.current);
      }

      return () => observer.disconnect();
    }
  }, [priority, hoverOnly, delay, doPrefetch]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <a
      ref={linkRef}
      href={href}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
