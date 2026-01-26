-- Schema per lead della landing "Il Metodo Theoremz".
-- Esegui questo file nel SQL editor Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.ilmetodotheoremz_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text null,
  phone_prefix text null,
  phone text not null,
  page_url text null,
  source text not null default 'ilmetodotheoremz'
);

create index if not exists ilmetodotheoremz_leads_created_at_idx
  on public.ilmetodotheoremz_leads (created_at desc);
