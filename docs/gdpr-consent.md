GDPR Cookie Banner & Consent Log

What’s included

- Cookie banner: `components/CookieBanner.tsx` (mounted in `app/layout.tsx`). Small, bottom-right, with Reject, Preferences, Accept All.
- Consent Mode v2: default set to denied with `Script` in `app/layout.tsx` and restored from cookie if previously accepted.
- Consent storage: localStorage key `tz_consent_v2` and cookie `tz_consent` (expires in ~180 days) containing version, timestamp, and categories.
- Consent log API: `POST /api/consent/log` persists decisions to Firestore in `consent_logs` (if Firebase Admin envs are present); otherwise it no-ops gracefully.
- Manager link: `components/ConsentManagerLink.tsx` rendered in `components/Footer.tsx` to reopen the banner anytime.

Environment variables

- `NEXT_PUBLIC_CONSENT_VERSION` (optional): bump to invalidate stored consents when policy changes.
- Firebase Admin envs required to persist logs:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY` (with newlines escaped as `\n`)

Data recorded in Firestore

- Collection: `consent_logs`
- Document ID: `<anonId>_<timestamp>`
- Fields: `ts`, `version`, `action`, `source`, `categories`, `anonId`, `userId`, `referer`, `ua`, `ip` (if header present), `country`.

Notes

- GA4 loads with `send_page_view: false` and Consent Mode; analytics cookies are not set until user grants `analytics_storage`.
- The banner focuses on necessary + analytics; marketing is off by default and disabled.
- To audit consents, query Firestore by date or anonId/userId; export to CSV via Firebase console if needed.

