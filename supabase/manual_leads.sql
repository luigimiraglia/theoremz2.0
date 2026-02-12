-- Schema per gestione lead manuali con follow-up cadenzati.
-- Esegui questo file nel SQL editor Supabase.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.manual_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text null,
  instagram_handle text null,
  whatsapp_phone text null,
  note text null,
  channel text not null default 'whatsapp' check (channel in ('instagram', 'whatsapp', 'unknown')),
  status text not null default 'active' check (status in ('active', 'completed', 'dropped')),
  current_step integer not null default 0,
  next_follow_up_at timestamptz null,
  last_contacted_at timestamptz null,
  completed_at timestamptz null
);

-- Mantiene updated_at coerente
create or replace function public.manual_leads_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_manual_leads_set_updated_at on public.manual_leads;
create trigger trg_manual_leads_set_updated_at
before update on public.manual_leads
for each row
execute function public.manual_leads_set_updated_at();

create index if not exists manual_leads_next_follow_up_idx on public.manual_leads (status, next_follow_up_at);
create index if not exists manual_leads_channel_idx on public.manual_leads (channel);

alter table public.manual_leads
  add column if not exists response_status text not null default 'pending',
  add column if not exists responded_at timestamptz null,
  add column if not exists no_response_at timestamptz null,
  add column if not exists paused_at timestamptz null;

create index if not exists manual_leads_response_status_idx
  on public.manual_leads (response_status);
