-- Availability blocks for tutors (single contiguous ranges)
create table if not exists public.tutor_availability_blocks (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tutor_availability_blocks_valid check (ends_at > starts_at)
);

create index if not exists tutor_availability_blocks_tutor_idx
  on public.tutor_availability_blocks (tutor_id, starts_at);
