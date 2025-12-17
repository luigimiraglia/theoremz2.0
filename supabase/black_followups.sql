-- Tabella per follow-up manuali su studenti Black
-- Esegui nel SQL editor Supabase

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.black_followups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  student_id uuid null,
  full_name text null,
  whatsapp_phone text not null,
  note text null,
  status text not null default 'active' check (status in ('active', 'completed', 'dropped')),
  next_follow_up_at timestamptz not null default now(),
  last_contacted_at timestamptz null
);

create index if not exists black_followups_next_idx on public.black_followups (status, next_follow_up_at);
create index if not exists black_followups_status_idx on public.black_followups (status);

create or replace function public.black_followups_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_black_followups_set_updated_at on public.black_followups;
create trigger trg_black_followups_set_updated_at
before update on public.black_followups
for each row
execute function public.black_followups_set_updated_at();
