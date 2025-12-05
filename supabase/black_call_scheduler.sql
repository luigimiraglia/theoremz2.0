-- Schema for gestire slot disponibili/presi, tipi di chiamata (onboarding, check, ripetizioni),
-- durata variabile, tutor assegnati e booking atomici.
-- Esegui questo script nel SQL editor Supabase.

-- Estensioni (già abilitate su Supabase, le lascio idempotenti)
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Tipi di stato
do $$
begin
  if not exists (select 1 from pg_type where typname = 'call_slot_status') then
    create type call_slot_status as enum ('available', 'booked', 'blocked');
  end if;
  if not exists (select 1 from pg_type where typname = 'call_booking_status') then
    create type call_booking_status as enum ('confirmed', 'cancelled');
  end if;
end $$;

-- Tipi di chiamata (es. onboarding 30', check 20', ripetizione 55')
create table if not exists public.call_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text null,
  duration_min integer not null check (duration_min > 0),
  active boolean not null default true,
  max_parallel integer not null default 1 check (max_parallel > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists call_types_active_idx on public.call_types (active);

-- Tutor
create table if not exists public.tutors (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  full_name text,
  email text null unique,
  phone text null,
  bio text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Garantisce la presenza della colonna display_name anche se la tabella esisteva con schema diverso
alter table public.tutors
  add column if not exists display_name text;
-- Garantisce la presenza della colonna full_name per compatibilità con schemi precedenti
alter table public.tutors
  add column if not exists full_name text;
-- Sanifica eventuali null per rispettare constraint esistenti
update public.tutors
set full_name = coalesce(full_name, display_name, email, 'N/A')
where full_name is null;
-- Se la colonna è già not null altrove, questa alter non fallirà; altrimenti impone il vincolo
do $$
begin
  alter table public.tutors alter column full_name set not null;
exception when others then
  null;
end $$;
-- Garantisce l'unicità dell'email per usare ON CONFLICT
create unique index if not exists tutors_email_key on public.tutors (email);

-- Relazione molti-a-molti tutor <-> tipi di chiamata (per abilitazioni)
create table if not exists public.tutor_call_types (
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  call_type_id uuid not null references public.call_types (id) on delete cascade,
  active boolean not null default true,
  primary key (tutor_id, call_type_id)
);
create unique index if not exists tutor_call_types_pk on public.tutor_call_types (tutor_id, call_type_id);

-- Slot di calendario (singolo blocco orario)
create table if not exists public.call_slots (
  id uuid primary key default gen_random_uuid(),
  call_type_id uuid not null references public.call_types (id) on delete restrict,
  tutor_id uuid not null references public.tutors (id) on delete restrict,
  starts_at timestamptz not null,
  duration_min integer not null check (duration_min > 0),
  ends_at timestamptz not null,
  status call_slot_status not null default 'available',
  notes text null,
  capacity integer not null default 1 check (capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint call_slots_future check (starts_at >= now() - interval '1 day'),
  constraint call_slots_unique_per_tutor unique (tutor_id, starts_at)
);
create index if not exists call_slots_lookup_idx on public.call_slots (call_type_id, tutor_id, starts_at);
create index if not exists call_slots_status_idx on public.call_slots (status, starts_at);

-- Trigger per mantenere ends_at coerente
create or replace function public.call_slots_set_ends_at()
returns trigger
language plpgsql
as $$
begin
  new.ends_at := new.starts_at + (new.duration_min * interval '1 minute');
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_call_slots_set_ends_at on public.call_slots;
create trigger trg_call_slots_set_ends_at
before insert or update of starts_at, duration_min
on public.call_slots
for each row
execute function public.call_slots_set_ends_at();

-- Booking dello slot
create table if not exists public.call_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.call_slots (id) on delete cascade,
  call_type_id uuid not null references public.call_types (id) on delete restrict,
  tutor_id uuid not null references public.tutors (id) on delete restrict,
  user_id text null, -- compatibile con schema esistente (text)
  full_name text not null,
  email text not null,
  note text null,
  status call_booking_status not null default 'confirmed',
  booked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slot_id) -- capacità 1; rimuovi se usi capacity >1 e gestisci diversamente
);
create index if not exists call_bookings_user_idx on public.call_bookings (user_id, booked_at desc);

-- Vista dei posti liberi con join info
create or replace view public.call_slots_available as
select
  s.id as slot_id,
  s.starts_at,
  s.ends_at,
  s.status,
  s.tutor_id,
  t.display_name as tutor_name,
  s.call_type_id,
  ct.name as call_type_name,
  ct.duration_min,
  ct.slug as call_type_slug
from public.call_slots s
join public.call_types ct on ct.id = s.call_type_id
join public.tutors t on t.id = s.tutor_id
where s.status = 'available'
  and ct.active = true
  and s.starts_at >= now()
order by s.starts_at;

-- Funzione atomica per prenotare uno slot (blocca se già preso o non disponibile)
create or replace function public.book_call_slot(
  p_slot_id uuid,
  p_full_name text,
  p_email text,
  p_note text default null,
  p_user_id text default null
) returns public.call_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot record;
begin
  select s.*, ct.duration_min, ct.id as ct_id, t.id as tutor_id
  into v_slot
  from public.call_slots s
  join public.call_types ct on ct.id = s.call_type_id
  join public.tutors t on t.id = s.tutor_id
  where s.id = p_slot_id
  for update;

  if not found then
    raise exception 'Slot non trovato' using errcode = 'P0002';
  end if;
  if v_slot.status <> 'available' then
    raise exception 'Slot non disponibile' using errcode = 'P0001';
  end if;
  if v_slot.starts_at <= now() then
    raise exception 'Slot nel passato' using errcode = '22007';
  end if;

  update public.call_slots
  set status = 'booked', updated_at = now()
  where id = p_slot_id;

  insert into public.call_bookings (slot_id, call_type_id, tutor_id, user_id, full_name, email, note)
  values (p_slot_id, v_slot.ct_id, v_slot.tutor_id, p_user_id, p_full_name, p_email, p_note)
  returning * into v_slot;

  return v_slot;
end;
$$;

-- Esempi di seed minimi (facoltativi)
insert into public.call_types (slug, name, description, duration_min)
values
  ('onboarding', 'Onboarding Black', 'Prima call di setup', 30),
  ('check-percorso', 'Check percorso Black', 'Follow-up da 20 minuti', 20),
  ('ripetizione', 'Ripetizione', 'Lezione singola personalizzata', 55)
on conflict (slug) do nothing;

-- Esempio tutor (singolo)
insert into public.tutors (display_name, full_name, email)
values ('Luigi Miraglia', 'Luigi Miraglia', 'luigi.miraglia006@gmail.com')
on conflict (email) do nothing;

-- Abilita i tipi di chiamata al tutor (adatta con select id)
insert into public.tutor_call_types (tutor_id, call_type_id)
select t.id, ct.id
from public.tutors t
cross join public.call_types ct
on conflict do nothing;

-- Nota: aggiungi integrazione API lato app:
-- - Per creare slot: service key / backend inserisce righe in call_slots con duration_min coerente.
-- - Per mostrare disponibilità: SELECT * FROM call_slots_available WHERE call_type_slug = 'check-percorso' AND starts_at::date = '2024-01-01';
-- - Per prenotare: chiamare RPC book_call_slot con service role (o edge function) per mantenere atomicità.
