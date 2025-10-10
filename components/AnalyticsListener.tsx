"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { pageview } from "@/lib/analytics";

// Listens to SPA route changes and fires page_view.
export default function AnalyticsListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Fire page_view on route changes
  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    pageview(url);
  }, [pathname, searchParams]);

  return null;
}

