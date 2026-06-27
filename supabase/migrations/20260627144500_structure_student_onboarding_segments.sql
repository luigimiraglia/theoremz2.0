alter table if exists public.student_profiles
  add column if not exists onboarding_segment jsonb not null default '{}'::jsonb,
  add column if not exists current_focus_subject text,
  add column if not exists current_focus_topic text,
  add column if not exists current_focus_topic_code text,
  add column if not exists current_focus_need text,
  add column if not exists help_urgency text;

create index if not exists student_profiles_focus_subject_idx
  on public.student_profiles (current_focus_subject)
  where current_focus_subject is not null;

create index if not exists student_profiles_focus_topic_code_idx
  on public.student_profiles (current_focus_topic_code)
  where current_focus_topic_code is not null;

create index if not exists student_profiles_help_urgency_idx
  on public.student_profiles (help_urgency)
  where help_urgency is not null;

