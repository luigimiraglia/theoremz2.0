-- Salva la streak giornaliera dei contatti lead per Il Metodo Theoremz.
create table if not exists public.ilmetodotheoremz_lead_streaks (
  day_ymd text primary key,
  count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists ilmetodotheoremz_lead_streaks_updated_at_idx
  on public.ilmetodotheoremz_lead_streaks (updated_at desc);
