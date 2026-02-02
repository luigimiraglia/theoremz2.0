-- Schema for content production short videos.
-- Run this in Supabase SQL editor.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.content_short_video_formats (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_short_video_formats_name_idx
  on public.content_short_video_formats (name);

create or replace function public.content_short_video_formats_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_content_short_video_formats_set_updated_at on public.content_short_video_formats;
create trigger trg_content_short_video_formats_set_updated_at
before update on public.content_short_video_formats
for each row
execute function public.content_short_video_formats_set_updated_at();

create table if not exists public.content_editorial_plan (
  id uuid primary key default gen_random_uuid(),
  format text not null references public.content_short_video_formats(name) on update cascade on delete restrict,
  video_count integer not null check (video_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (format)
);

create index if not exists content_editorial_plan_format_idx
  on public.content_editorial_plan (format);

create or replace function public.content_editorial_plan_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_content_editorial_plan_set_updated_at on public.content_editorial_plan;
create trigger trg_content_editorial_plan_set_updated_at
before update on public.content_editorial_plan
for each row
execute function public.content_editorial_plan_set_updated_at();

create table if not exists public.content_editorial_settings (
  id uuid primary key default gen_random_uuid(),
  tracking_start_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.content_editorial_settings_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_content_editorial_settings_set_updated_at on public.content_editorial_settings;
create trigger trg_content_editorial_settings_set_updated_at
before update on public.content_editorial_settings
for each row
execute function public.content_editorial_settings_set_updated_at();

create table if not exists public.content_editorial_day_registry (
  day_date date primary key,
  status text not null check (status in ('met', 'partial', 'missed')),
  total_published integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_editorial_day_registry_date_idx
  on public.content_editorial_day_registry (day_date);

create or replace function public.content_editorial_day_registry_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_content_editorial_day_registry_set_updated_at on public.content_editorial_day_registry;
create trigger trg_content_editorial_day_registry_set_updated_at
before update on public.content_editorial_day_registry
for each row
execute function public.content_editorial_day_registry_set_updated_at();

create table if not exists public.content_short_videos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null default 'Senza titolo',
  script text not null,
  hook text not null,
  alt_hooks text[] not null default '{}',
  format text not null,
  edited_file_name text null,
  duration_sec integer null check (duration_sec is null or duration_sec >= 0),
  views integer null check (views is null or views >= 0),
  published_at timestamptz null,
  status text not null default 'bozza' check (status in ('bozza', 'girato', 'editato', 'pubblicato')),
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

insert into public.content_short_video_formats (name)
select distinct trim(format)
from public.content_short_videos
where format is not null and trim(format) <> ''
on conflict do nothing;
