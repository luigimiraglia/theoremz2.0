Analytics Overview

This site uses an internal analytics system that sends data to `/api/analytics` endpoint.

- Anonymous user IDs are generated in `lib/anonId.ts` (stored in localStorage and a first-party cookie)
- All analytics data is processed internally, no third-party analytics services are used

Tracked events

- page_view: routed by internal pageview tracking on every pathname+query change
- lesson_view: fired once on lesson mount from `components/LessonAnalytics.tsx`
- notes_open_click: when the "Appunti" viewer is opened
- exercise_cta_click: when the exercises CTA is clicked in lesson header
- subscribe_click: when a Stripe buy button is clicked (landing pages)
- subscription_active: when auth detects an active subscription for the logged-in user

Performance notes

- All analytics events are fire-and-forget — no UI blocking.
- Analytics tracking uses small client components and avoids heavy hydration.

Data privacy

- All analytics data is processed internally
- No data is shared with third-party analytics providers
- Users maintain full control over their data

