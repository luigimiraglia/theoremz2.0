-- Aggiunge stato risposta per lead disdette Black.
alter table if exists black_students
  add column if not exists response_status text not null default 'pending',
  add column if not exists responded_at timestamptz null,
  add column if not exists no_response_at timestamptz null,
  add column if not exists paused_at timestamptz null;

create index if not exists black_students_response_status_idx
  on black_students (response_status);
