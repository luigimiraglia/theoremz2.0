"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

function getConsent(): boolean {
  try {
    const m = document.cookie.match(/(?:^|; )tz_consent=([^;]+)/);
    if (!m) return false;
    const v = JSON.parse(decodeURIComponent(m[1]));
    return !!v?.c?.analytics;
  } catch {
    return false;
  }
}

export default function ClientAnalytics() {
  const [loadGa, setLoadGa] = useState(false);
  const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID as string | undefined;

  useEffect(() => {
    if (!GA_ID) return;
    if (getConsent()) setLoadGa(true);
  }, [GA_ID]);

  if (!loadGa || !GA_ID) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init-client" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);} 
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true, send_page_view: false });
        `}
      </Script>
    </>
  );
}

