Analytics (GA4) Overview

- Add NEXT_PUBLIC_GA_MEASUREMENT_ID to `.env.local` to enable GA4.
- Scripts are injected in `app/layout.tsx` after interactive, with `send_page_view: false` to avoid double-counting; SPA pageviews are tracked in `components/AnalyticsListener.tsx`.
- Anonymous user IDs are generated in `lib/anonId.ts` (stored in localStorage and a first-party cookie) and passed as a user property `tz_anon_id` so you can create a GA4 custom user dimension.

Tracked events

- page_view: routed by `AnalyticsListener` on every pathname+query change
- lesson_view: fired once on lesson mount from `components/LessonAnalytics.tsx`
- notes_open_click: when the "Appunti" viewer is opened
- exercise_cta_click: when the exercises CTA is clicked in lesson header
- subscribe_click: when a Stripe buy button is clicked (landing pages)
- subscription_active: when auth detects an active subscription for the logged-in user

Performance notes

- GA scripts load `afterInteractive` and event calls are fire-and-forget — no UI blocking.
- The tracking wrapper is a no-op when GA ID is not set.
- Route tracking uses small client components and avoids heavy hydration.

Next steps

- In GA4, add a custom user dimension for `tz_anon_id` to tie anonymous sessions.
- Optionally add server-side conversion tracking via GA4 Measurement Protocol from Stripe webhooks for more robust subscription attribution.

