create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  auth_uid text unique,
  full_name text,
  email text,
  phone text,
  phone_normalized text,
  current_average numeric,
  source text default 'manual',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists students_email_idx
  on public.students (email);

create index if not exists students_phone_normalized_idx
  on public.students (phone_normalized);

create index if not exists student_assessments_user_id_idx
  on public.student_assessments (user_id);

create index if not exists student_grades_user_id_idx
  on public.student_grades (user_id);

create index if not exists student_lessons_progress_user_id_idx
  on public.student_lessons_progress (user_id);

create index if not exists student_exercises_progress_user_id_idx
  on public.student_exercises_progress (user_id);

create index if not exists student_difficulties_user_id_idx
  on public.student_difficulties (user_id);

create index if not exists student_access_logs_user_id_idx
  on public.student_access_logs (user_id);

create index if not exists black_students_user_id_idx
  on public.black_students (user_id);

alter table if exists public.profiles
  add column if not exists stripe_cancel_at_period_end boolean default false;

alter table if exists public.profiles
  add column if not exists stripe_canceled_at timestamp with time zone;

alter table if exists public.student_profiles
  add column if not exists student_id uuid references public.students(id);

alter table if exists public.student_assessments
  add column if not exists student_id uuid references public.students(id);

alter table if exists public.student_grades
  add column if not exists student_id uuid references public.students(id);

alter table if exists public.student_lessons_progress
  add column if not exists student_id uuid references public.students(id);

alter table if exists public.student_exercises_progress
  add column if not exists student_id uuid references public.students(id);

alter table if exists public.student_difficulties
  add column if not exists student_id uuid references public.students(id);

alter table if exists public.student_access_logs
  add column if not exists student_id uuid references public.students(id);

alter table if exists public.student_saved_lessons
  add column if not exists student_id uuid references public.students(id);

alter table if exists public.black_students
  add column if not exists student_id uuid references public.students(id);

alter table if exists public.students
  add column if not exists current_average numeric;

alter table if exists public.black_students
  add column if not exists program_kind text;

create unique index if not exists student_profiles_student_id_key
  on public.student_profiles (student_id)
  where student_id is not null;

create unique index if not exists black_students_student_id_key
  on public.black_students (student_id)
  where student_id is not null;

create index if not exists student_assessments_student_id_idx
  on public.student_assessments (student_id);

create index if not exists student_grades_student_id_idx
  on public.student_grades (student_id);

create index if not exists student_lessons_progress_student_id_idx
  on public.student_lessons_progress (student_id);

create index if not exists student_exercises_progress_student_id_idx
  on public.student_exercises_progress (student_id);

create index if not exists student_difficulties_student_id_idx
  on public.student_difficulties (student_id);

create index if not exists student_access_logs_student_id_idx
  on public.student_access_logs (student_id);

create index if not exists student_saved_lessons_student_id_idx
  on public.student_saved_lessons (student_id);

create index if not exists black_students_student_id_idx
  on public.black_students (student_id);

create index if not exists student_assessments_student_date_idx
  on public.student_assessments (student_id, date);

create index if not exists student_grades_student_taken_on_idx
  on public.student_grades (student_id, taken_on desc);

create index if not exists profiles_stripe_status_idx
  on public.profiles (stripe_subscription_status, stripe_cancel_at_period_end);

update public.students s
set current_average = sp.media_attuale,
    updated_at = now()
from public.student_profiles sp
where sp.student_id = s.id
  and sp.media_attuale is not null
  and s.current_average is null;

update public.black_students
set program_kind = 'subscription'
where program_kind is null;
