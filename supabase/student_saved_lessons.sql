-- Recreate the table that stores saved lessons for each student.
-- Run this file from the Supabase SQL editor or via psql.

drop table if exists public.student_saved_lessons cascade;

create table public.student_saved_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  lesson_id text not null,
  lesson_slug text not null,
  title text not null,
  thumb_url text null,
  status text not null default 'saved',
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  notes text null,
  constraint student_saved_lessons_user_lesson_key unique (user_id, lesson_id),
  constraint student_saved_lessons_user_slug_key unique (user_id, lesson_slug)
);

create index if not exists student_saved_lessons_user_idx
  on public.student_saved_lessons (user_id);

create index if not exists student_saved_lessons_saved_at_idx
  on public.student_saved_lessons (user_id, saved_at desc);
