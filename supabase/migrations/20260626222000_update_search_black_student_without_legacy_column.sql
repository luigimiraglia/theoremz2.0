drop function if exists public.search_black_student(text);

create or replace function public.search_black_student(q text)
returns table(student_id uuid, student_name text, user_id text)
language sql
stable
set search_path = public
as $$
  select
    s.id as student_id,
    coalesce(s.preferred_name, s.full_name, s.student_email, s.parent_email, 'Studente') as student_name,
    s.auth_uid as user_id
  from public.students s
  where s.black_active is true
     or s.subscription_tier in ('black', 'mentor')
     or s.program_kind is not null
     or s.black_since is not null
  order by
    case
      when lower(coalesce(s.preferred_name, s.full_name, s.student_email, s.parent_email, '')) = lower(q) then 0
      when lower(coalesce(s.preferred_name, s.full_name, s.student_email, s.parent_email, '')) like lower(q) || '%' then 1
      when lower(coalesce(s.preferred_name, s.full_name, s.student_email, s.parent_email, '')) like '%' || lower(q) || '%' then 2
      else 3
    end,
    coalesce(s.preferred_name, s.full_name, s.student_email, s.parent_email, 'Studente')
  limit 8
$$;
