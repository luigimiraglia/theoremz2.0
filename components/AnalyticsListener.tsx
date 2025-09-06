"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { identify, pageview, setUserProps } from "@/lib/analytics";
import { getAnonId } from "@/lib/anonId";
import { useAuth } from "@/lib/AuthContext";

// Listens to SPA route changes and fires GA4 page_view.
// Also sets anonymous ID as a user property for custom reporting.

export default function AnalyticsListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Attach anon ID once
  useEffect(() => {
    const anon = getAnonId();
    if (anon) setUserProps({ tz_anon_id: anon });
  }, []);

  // Identify logged-in users (user_id)
  useEffect(() => {
    identify(user?.uid);
  }, [user?.uid]);

  // Fire page_view on route changes
  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    pageview(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return null;
}

