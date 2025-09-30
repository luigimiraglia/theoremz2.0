"use client";
import { useCallback, useMemo } from "react";
import { track } from "@/lib/analytics";

export default function OpenInBrowserButton({
  href = "https://theoremz.com",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isInstagram = /Instagram/i.test(ua);
  const isFacebookIAB = /FBAN|FB_IAB|FBAV/i.test(ua);
  const isTikTok = /TikTok/i.test(ua);

  const isInApp = isInstagram || isFacebookIAB || isTikTok;

  const openExternal = useCallback(() => {
    const site = href;
    try {
      track("linkinbio_open_site", {
        href: site,
        in_app: isInApp,
        ua_instagram: isInstagram,
        ua_facebook_iab: isFacebookIAB,
        ua_tiktok: isTikTok,
        platform: isIOS ? "ios" : isAndroid ? "android" : "other",
        source: "link-in-bio",
      });
      if (isAndroid && isInApp) {
        // Try Chrome intent on Android
        const intent = `intent://${site.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
        // Use _self to replace the in-app webview
        window.location.href = intent;
        // Fallback after short delay
        setTimeout(() => {
          window.open(site, "_blank", "noopener,noreferrer");
        }, 500);
        return;
      }
      if (isIOS && isInApp) {
        // Try Chrome scheme on iOS if installed; fallback to default
        const chromeUrl = site.replace(/^https?:\/\//, "googlechromes://");
        const timer = setTimeout(() => {
          window.open(site, "_blank", "noopener,noreferrer");
        }, 400);
        // Attempt to open Chrome; many IABs will block but fallback handles it
        window.location.href = chromeUrl;
        // If Chrome opens, clear the fallback
        setTimeout(() => clearTimeout(timer), 800);
        return;
      }
      // Default behavior
      window.open(site, "_blank", "noopener,noreferrer");
    } catch {
      window.location.href = site;
    }
  }, [href, isAndroid, isIOS, isInApp]);

  const hint = useMemo(() => {
    if (!isInApp) return null;
    if (isIOS)
      return "Se sei su Instagram, tocca ⋯ e scegli ‘Apri in Safari’.";
    if (isAndroid)
      return "Se sei su Instagram, apri il menu ⋮ e scegli ‘Apri in Chrome’.";
    return null;
  }, [isAndroid, isIOS, isInApp]);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={openExternal}
        className="block w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 px-5 py-3 text-center text-[15px] font-extrabold text-white shadow-[0_8px_0_#3730a3] active:translate-y-[1px] active:shadow-[0_7px_0_#3730a3]"
        aria-label="Apri il sito nel browser (Safari/Chrome)"
      >
        🌐 Apri il sito nel browser (Safari/Chrome)
      </button>
      {hint ? (
        <p className="mt-2 text-center text-[12px] font-semibold text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
