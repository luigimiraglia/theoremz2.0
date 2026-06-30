-- Atomic increment for tutors.hours_due to prevent read-modify-write race conditions
-- when multiple booking completions fire concurrently for the same tutor.
create or replace function increment_tutor_hours_due(p_tutor_id uuid, p_delta numeric)
returns void
language sql
security definer
as $$
  update tutors
  set hours_due = hours_due + p_delta,
      updated_at = now()
  where id = p_tutor_id;
$$;
