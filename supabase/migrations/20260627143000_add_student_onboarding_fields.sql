alter table if exists public.student_profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_version text,
  add column if not exists onboarding_return_to text,
  add column if not exists tutor_help_requested boolean not null default false,
  add column if not exists tutor_help_requested_at timestamptz;

create index if not exists student_profiles_onboarding_completed_idx
  on public.student_profiles (onboarding_completed_at)
  where onboarding_completed_at is not null;

