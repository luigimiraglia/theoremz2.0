alter table public.students
  add column if not exists user_id text,
  add column if not exists student_name text,
  add column if not exists status text,
  add column if not exists start_date date,
  add column if not exists last_active_at timestamptz,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists tutor_id text,
  add column if not exists current_avg numeric,
  add column if not exists grades_count bigint,
  add column if not exists tutor_name text,
  add column if not exists tutor_email text;

update public.students
set
  user_id = coalesce(user_id, auth_uid),
  student_name = coalesce(student_name, preferred_name, full_name, student_email, parent_email),
  status = coalesce(status, black_status, subscription_status, case when black_active then 'active' else 'inactive' end),
  start_date = coalesce(start_date, black_since),
  last_active_at = coalesce(last_active_at, black_last_active_at),
  last_contacted_at = coalesce(last_contacted_at, black_last_contacted_at),
  tutor_id = coalesce(tutor_id, black_tutor_id),
  current_avg = coalesce(current_avg, current_average),
  updated_at = now()
where user_id is null
   or student_name is null
   or status is null
   or start_date is null
   or last_active_at is null
   or last_contacted_at is null
   or tutor_id is null
   or current_avg is null;

create or replace function public.sync_students_operational_aliases()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.auth_uid := coalesce(new.auth_uid, new.user_id);
  new.user_id := coalesce(new.user_id, new.auth_uid);

  new.preferred_name := coalesce(new.preferred_name, new.student_name);
  new.full_name := coalesce(new.full_name, new.student_name, new.preferred_name);
  new.student_name := coalesce(new.student_name, new.preferred_name, new.full_name, new.student_email, new.parent_email);

  new.black_status := coalesce(new.black_status, new.status);
  new.status := coalesce(new.status, new.black_status, new.subscription_status, case when new.black_active then 'active' else 'inactive' end);

  new.black_since := coalesce(new.black_since, new.start_date);
  new.start_date := coalesce(new.start_date, new.black_since);

  new.black_last_active_at := coalesce(new.black_last_active_at, new.last_active_at);
  new.last_active_at := coalesce(new.last_active_at, new.black_last_active_at);

  new.black_last_contacted_at := coalesce(new.black_last_contacted_at, new.last_contacted_at);
  new.last_contacted_at := coalesce(new.last_contacted_at, new.black_last_contacted_at);

  new.black_tutor_id := coalesce(new.black_tutor_id, new.tutor_id);
  new.tutor_id := coalesce(new.tutor_id, new.black_tutor_id);

  new.current_average := coalesce(new.current_average, new.current_avg);
  new.current_avg := coalesce(new.current_avg, new.current_average);

  return new;
end;
$$;

drop trigger if exists sync_students_operational_aliases_trg on public.students;
create trigger sync_students_operational_aliases_trg
before insert or update on public.students
for each row
execute function public.sync_students_operational_aliases();

drop view if exists public.black_students cascade;
drop function if exists public.black_students_view_insert();
drop function if exists public.black_students_view_update();
drop function if exists public.black_students_view_delete();

drop function if exists public.resolve_canonical_student_id(uuid);
create or replace function public.resolve_canonical_student_id(_student uuid)
returns uuid
language sql
stable
set search_path = public
as $$
  select _student
$$;

drop view if exists public.black_student_card;
drop view if exists public.black_events_feed;

create or replace view public.black_events_feed as
select
  bn.id,
  bn.student_id,
  bn.created_at as at,
  'note'::text as type,
  bn.body as details
from public.black_notes bn
union all
select
  bg.id,
  bg.student_id,
  coalesce(bg.when_at::timestamptz, bg.created_at) as at,
  'grade'::text as type,
  concat_ws(' ', bg.subject, bg.score::text || '/' || coalesce(bg.max_score::text, '10')) as details
from public.black_grades bg
union all
select
  ba.id,
  ba.student_id,
  coalesce(ba.when_at::timestamptz, ba.created_at) as at,
  'assessment'::text as type,
  concat_ws(' - ', ba.subject, ba.topics) as details
from public.black_assessments ba
union all
select
  bcl.id,
  bcl.student_id,
  bcl.contacted_at as at,
  'contact'::text as type,
  bcl.body as details
from public.black_contact_logs bcl
union all
select
  bal.id,
  s.id as student_id,
  bal.last_access_at as at,
  'access'::text as type,
  concat('Accessi giorno: ', bal.access_count::text) as details
from public.black_access_logs bal
join public.students s on s.auth_uid = bal.user_id;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'students_auth_uid_profiles_fkey') then
    alter table public.students
      add constraint students_auth_uid_profiles_fkey
      foreign key (auth_uid) references public.profiles(id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'students_tutor_id_profiles_fkey') then
    alter table public.students
      add constraint students_tutor_id_profiles_fkey
      foreign key (tutor_id) references public.profiles(id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'students_videolesson_tutor_id_fkey') then
    alter table public.students
      add constraint students_videolesson_tutor_id_fkey
      foreign key (videolesson_tutor_id) references public.tutors(id) not valid;
  end if;
end $$;
