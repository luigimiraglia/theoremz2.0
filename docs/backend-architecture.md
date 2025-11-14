# Backend Architecture (2025-11)

This document summarizes the current server-side architecture so that we can keep Supabase, Firestore, and the bot in sync without “losing” tables, constraints, or values.

---

## 1. Data sources

| Layer          | Purpose                                                                 | Notes |
|----------------|-------------------------------------------------------------------------|-------|
| **Firebase Auth** | Primary identity provider (UID used everywhere).                         | `adminAuth` verifies ID tokens, both API routes and bot webhooks rely on it. |
| **Firestore**  | Legacy per-user metadata + collections (`users/{uid}/exams`, `grades`, `savedLessons`). Still used by the account UI. | Gradually being phased out once the account UI reads from Supabase. |
| **Supabase**   | Source of truth for “Black” program tables and the new “student_*” lite tables. | Accessed via `supabaseServer()` (service-role key). |
| **Stripe**     | Billing for Black. Webhooks write to Supabase `black_stripe_signups` + Firestore meta. |
| **Telegram Bot** | Operational tool for mentors/admins.                                    | Runs through `/app/api/telegram/hook/route.ts`. |

---

## 2. Authentication & Permissions

1. **Client → API**: Every `/api/me/*` route expects `Authorization: Bearer <Firebase ID token>`. We verify tokens with `adminAuth`.
2. **Service operations** (newsletter, bot, scripts) use Supabase service role keys and Firebase Admin credentials (.env).
3. **Supabase RLS**: Disabled for the new `student_*` tables (service role only). Legacy `black_*` tables still rely on RLS + DB functions.

---

## 3. Table inventory

### 3.1 “Student Lite” tables (Supabase)

All use `text` UID columns to match Firebase UIDs. Triggers & enums are optional.

1. `student_profiles`
   - `user_id text PRIMARY KEY`
   - `full_name`, `nickname`, `phone`, `email`
   - `cycle edu_cycle` (enum values: `medie`, `superiori`, `universita`, `altro`; “liceo” is normalized to `superiori`)
   - `indirizzo`, `school_year`
   - `is_black boolean`
   - Progress fields: `media_attuale numeric(6,2)`, `goal_grade numeric(6,2)`, arrays for topics/difficulties, `confidence_math`
   - `newsletter_opt_in boolean`
   - `last_access_at timestamptz` (updated by `/api/me/access-log`)
   - `created_at`, `updated_at`
   - Trigger `promote_to_black` ensures a Black profile upgrade (calls `ensure_black_profile`).

2. `student_assessments`
   - `id uuid PK` (deterministic per UID+seed)
   - `user_id text`, `kind text` (`verifica` or `interrogazione`)
   - `date date`, `subject text NULLABLE`, `topics`, `notes`
   - `grade numeric(6,2)` nullable, `grade_photo_url`
   - `created_at`, `updated_at`

3. `student_grades`
   - `id uuid PK`
   - `user_id text`
   - `subject text`
   - `grade numeric(6,2)` sanitized to ±100
   - `taken_on date`
   - `source text`
   - `assessment_id uuid` (nullable FK to `student_assessments(id)`)
   - `created_at`, `updated_at`

4. `student_lessons_progress`
   - `id uuid PK`
   - `user_id text`, `slug text`
   - `status text` (`saved` / `completed`)
   - `updated_at`
   - Unique `(user_id, slug, status)`

5. `student_exercises_progress`
   - `id uuid PK`
   - `user_id text`, `exercise_id text`
   - `completed_at`
   - Unique `(user_id, exercise_id)`

6. `student_difficulties`
   - `id uuid PK`
   - `user_id text`
   - `subject text`, `topic text`
   - `difficulty_level int`
   - `created_at`

7. `student_access_logs`
   - `id uuid PK default gen_random_uuid()`
   - `user_id text`
   - `accessed_at timestamptz default now()`
   - `session_id text`
   - `ip text`
   - `user_agent text`

### 3.2 “Black” namespace (Supabase)

Legacy tables (`black_students`, `black_assessments`, `black_grades`, `black_notes`, `black_contact_logs`, `black_stripe_signups`, etc.) remain untouched. They store additional metadata for paid programs and are still used by the bot and dashboards.

---

## 4. Data flow & sync points

### 4.1 Account UI (`/app/api/me/*`)

| Route                          | Firestore                                     | Supabase (“lite”)                                 |
|--------------------------------|-----------------------------------------------|---------------------------------------------------|
| `GET /api/me/exams`            | Reads `users/{uid}/exams`                     | — (for now; UI still reads Firestore)             |
| `POST /api/me/exams`           | Adds doc to `exams`                           | `recordStudentAssessmentLite` + Black sync        |
| `GET /api/me/grades`           | Reads `users/{uid}/grades`                    | —                                                 |
| `POST /api/me/grades`          | Adds doc to `grades`, links to exam           | `recordStudentGradeLite` + Black sync             |
| `POST /api/me/init-lite-profile` | —                                           | Ensures `student_profiles` row exists for the newly created Firebase UID (called right after signup). |
| `POST /api/me/access-log`      | —                                             | Updates `student_profiles.last_access_at` + inserts into `student_access_logs` |
| `GET/POST /api/me/profile`     | Reads/writes root doc `users/{uid}`           | `syncLiteProfilePatch` normalizes cycle/year/etc. |
| `GET/POST /api/me/saved-lessons` | Reads/writes `users/{uid}/savedLessons` subcollection | `upsertSavedLessonLite` / `deleteSavedLessonLite` |
| `/api/account/username`        | Reserves username doc + updates profile       | Mirrors nickname via `syncLiteProfilePatch`       |
| `/api/newsletter`              | Upserts `newsletter_subscriptions` (Supabase) | Also updates `student_profiles.newsletter_opt_in` |

### 4.2 Telegram bot (`/app/api/telegram/hook/route.ts`)

- Works on Supabase `black_*` tables for paid students.
- After every `/ass`, `/verifica`, `/voto` command it mirrors updates to:
  1. Firestore (`users/{uid}/exams|grades`)
  2. Supabase lite (`recordStudentAssessmentLite`, `recordStudentGradeLite`)
- `fetchStudentUserId` resolves `user_id` to `uid` for both Firestore and lite sync.

### 4.3 Scripts

1. `scripts/backfill-student-lite.mjs`
   - Reads all Firestore user docs (`users`)
   - Upserts `student_profiles`, `student_assessments`, `student_grades`, `student_lessons_progress`
   - Normalizes cycles (`liceo`→`superiori`) and skips grades beyond ±100.
   - Requires `.env.local` (service keys) + Firebase Admin credentials.

2. `scripts/sync-assessments-to-firestore.mjs`
   - Older tool: Supabase `black_assessments` + `black_grades` → Firestore (ensures parity so the UI sees bot-created items).

3. `scripts/update-lite-is-black.mjs`
   - Sets `student_profiles.is_black` to `true` for every user present in `black_students` with an active status, `false` otherwise.
   - Requires the trigger function `ensure_black_profile(text)` to exist (or disable the trigger temporarily) because mass-updates fire the `promote_to_black` trigger.

4. Other utilities: `seed-black-students.mjs`, `subscriptionSync.ts` (Stripe reconciliation) still operate only on the Black subset.

---

## 5. Helper libraries

| File                    | Role |
|-------------------------|------|
| `lib/studentLiteSync.ts` | Deterministic IDs, normalization helpers, Supabase upserts for the lite tables. Used by `/api/me/*`, newsletter API, and bot mirrors. |
| `lib/black/gradeSync.ts` | Shared logic for Black brief refresh and grade attachments. |
| `lib/firebaseAdmin.ts`   | Singleton Firebase Admin app + Firestore instance. |
| `lib/supabase.ts`        | Creates Supabase server client with service key. |

---

## 6. Constraints / business rules

1. **Grades & media**: truncated to ±100 before upsert; out-of-range grades are ignored to avoid `numeric` overflows.
2. **Cycle normalization**: input “liceo” becomes `superiori`; unsupported values are stored as `NULL`.
3. **Assessments**: subject is optional (`NULL` allowed). Bot/account include topics/notes when available.
4. **Saved lessons**: deterministic IDs per `(uid, slug, status)` to prevent duplicates between bot/account/API.
5. **Newsletter**: any subscription/unsubscription updates `student_profiles.newsletter_opt_in`.
6. **Black upgrade**: toggling `student_profiles.is_black` runs `promote_to_black` trigger (calls custom function to ensure `black_students` row).

---

## 7. Outstanding work

- Account UI still reads Firestore collections (`exams`, `grades`, `savedLessons`). Once data parity is validated, switch `/api/me/exams|grades|saved-lessons` GET handlers to Supabase.
- Eventually remove Firestore backfill script and telemetry, keeping only Supabase.
- Decide on RLS (currently off) for `student_*` tables if client-side reads move to Supabase.
- Document any additional enums or domain values when new fields are added (e.g., difficulty topics, lesson statuses).
- Create the placeholder function `create function public.ensure_black_profile(text) returns void language sql as $$ select 1 $$;` (or the real implementation) so the `promote_to_black` trigger and the `update-lite-is-black` script can run without errors.

---

Appendix: keep `.env.local` with both Supabase service key and Firebase Admin credentials. All scripts & API routes read from this file via `dotenv`.
