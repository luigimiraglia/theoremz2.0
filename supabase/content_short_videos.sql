-- Schema for content production short videos.
-- Run this in Supabase SQL editor.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.content_short_videos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  script text not null,
  hook text not null,
  format text not null,
  duration_sec integer null check (duration_sec is null or duration_sec >= 0),
  views integer null check (views is null or views >= 0),
  published_at timestamptz null,
  status text not null default 'girato' check (status in ('girato', 'editato', 'pubblicato')),
  constraint content_short_videos_published_requirements check (
    status <> 'pubblicato'
    or (duration_sec is not null and views is not null and published_at is not null)
  )
);

create index if not exists content_short_videos_status_idx
  on public.content_short_videos (status);

create index if not exists content_short_videos_published_idx
  on public.content_short_videos (published_at desc);

create index if not exists content_short_videos_views_idx
  on public.content_short_videos (views desc);

create or replace function public.content_short_videos_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_content_short_videos_set_updated_at on public.content_short_videos;
create trigger trg_content_short_videos_set_updated_at
before update on public.content_short_videos
for each row
execute function public.content_short_videos_set_updated_at();
