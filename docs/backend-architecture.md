# Backend Architecture

This document reflects the current post-refactor architecture.

## Data Sources

| Layer | Purpose | Notes |
| --- | --- | --- |
| **Firebase Auth** | Identity provider only. | API routes verify Firebase ID tokens with `adminAuth`. No application data is stored in Firebase. |
| **Supabase** | Source of truth for students, profiles, leads, account data, Black data, logs, and operational tables. | Server routes use `supabaseServer()` with the service-role key. |
| **Stripe** | Billing for Black. | Webhooks update Supabase subscription state and `black_stripe_signups`. |
| **Telegram Bot** | Operational tool for mentors/admins. | Reads and writes Supabase tables through `/app/api/telegram/hook/route.ts`. |

## Student Source Of Truth

`students` is the canonical identity table for a student. Firebase UID is stored as `students.auth_uid` and is linked to the account profile in `student_profiles.user_id`.

Primary account tables:

- `students`: canonical student identity, contacts, subscription state, and activity fields.
- `student_profiles`: account/profile/onboarding fields for the Firebase UID.
- `student_assessments`: checks/interrogations visible in the account area.
- `student_grades`: grades, optionally linked to `student_assessments.assessment_id`.
- `student_saved_lessons` and `student_lessons_progress`: saved/completed lesson state.
- `student_streaks`: daily study streak.
- `student_access_logs`: account access events.

## Leads

`canonical_leads` is the source of truth for leads. Public lead routes and quiz routes upsert into it directly through `upsertCanonicalLead`.

Lead quality and follow-up state should be computed from fields on `canonical_leads`, especially funnel/source, age, phone availability, student/account linkage, status, response status, and follow-up timestamps.

## Black And Stripe

Black state is synchronized into Supabase:

- Stripe webhook and manual sync update `students` subscription fields, `profiles`, `student_profiles.is_black`, `black_stripe_signups`, and Black operational tables.
- `/api/black/activity` updates Supabase profile/activity rows and never reads Firebase application data.
- Telegram commands write Black tables and mirror relevant student-facing assessments/grades into `student_assessments`/`student_grades`.

## Firebase Boundary

Allowed Firebase usage:

- Client login/logout and Google/password auth through Firebase Auth.
- Server-side ID token verification through `adminAuth`.
- Optional Firebase Auth user updates such as `displayName`.

Not allowed:

- Reading or writing Firestore for profile data, account data, leads, grades, checks, saved lessons, Stripe logs, consent logs, or Black metadata.

## Scripts

Current npm scripts do not run Firestore migrations or Firestore backfills. Historical Firestore migration scripts were removed after the Supabase refactor.
