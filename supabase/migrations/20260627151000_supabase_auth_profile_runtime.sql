create table if not exists public.usernames (
  username text primary key,
  owner_auth_uid text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usernames_username_format_check
    check (username ~ '^[a-z0-9_]{3,20}$')
);

create unique index if not exists usernames_owner_auth_uid_key
  on public.usernames (owner_auth_uid);

create table if not exists public.student_streaks (
  user_id text primary key,
  student_id uuid references public.students(id) on delete cascade,
  last_date date,
  count integer not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_streaks_student_id_idx
  on public.student_streaks (student_id)
  where student_id is not null;

create table if not exists public.consent_logs (
  id text primary key,
  recorded_at timestamptz not null default now(),
  version text,
  action text,
  source text,
  categories jsonb,
  anon_id text,
  user_id text,
  referer text,
  user_agent text,
  ip text,
  country text
);

create index if not exists consent_logs_user_id_idx
  on public.consent_logs (user_id)
  where user_id is not null;

create index if not exists consent_logs_recorded_at_idx
  on public.consent_logs (recorded_at desc);

create table if not exists public.lesson_reviews (
  id uuid primary key default gen_random_uuid(),
  lesson text not null,
  name text not null,
  email text,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  user_agent text,
  referer text,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists lesson_reviews_lesson_created_at_idx
  on public.lesson_reviews (lesson, created_at desc);

create table if not exists public.stripe_subscription_logs (
  session_id text primary key,
  plan_name text,
  email text,
  phone text,
  customer_name text,
  amount text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
