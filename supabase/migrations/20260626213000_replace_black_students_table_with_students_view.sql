alter table public.students
  add column if not exists black_status text,
  add column if not exists initial_avg numeric,
  add column if not exists black_tutor_id text,
  add column if not exists response_status text not null default 'new',
  add column if not exists responded_at timestamptz,
  add column if not exists no_response_at timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists preferred_name_updated_at timestamptz;

alter table public.students
  alter column black_tutor_id type text using black_tutor_id::text;

update public.students s
set
  legacy_black_student_id = coalesce(s.legacy_black_student_id, bs.id),
  auth_uid = coalesce(s.auth_uid, bs.user_id),
  full_name = coalesce(s.full_name, bs.preferred_name, bs.student_name, bs.parent_name),
  preferred_name = coalesce(s.preferred_name, bs.preferred_name, bs.student_name),
  student_email = coalesce(s.student_email, bs.student_email),
  student_phone = coalesce(s.student_phone, bs.student_phone),
  parent_name = coalesce(s.parent_name, bs.parent_name),
  parent_email = coalesce(s.parent_email, bs.parent_email),
  parent_phone = coalesce(s.parent_phone, bs.parent_phone),
  year_class = coalesce(s.year_class, bs.year_class),
  track = coalesce(s.track, bs.track),
  goal = coalesce(s.goal, bs.goal),
  difficulty_focus = coalesce(s.difficulty_focus, bs.difficulty_focus),
  readiness = coalesce(s.readiness, bs.readiness),
  risk_level = coalesce(s.risk_level, bs.risk_level),
  ai_description = coalesce(s.ai_description, bs.ai_description),
  next_assessment_subject = coalesce(s.next_assessment_subject, bs.next_assessment_subject),
  next_assessment_date = coalesce(s.next_assessment_date, bs.next_assessment_date),
  videolesson_tutor_id = coalesce(s.videolesson_tutor_id, bs.videolesson_tutor_id),
  hours_paid = coalesce(s.hours_paid, bs.hours_paid, 0),
  hours_consumed = coalesce(s.hours_consumed, bs.hours_consumed, 0),
  whatsapp_group_link = coalesce(s.whatsapp_group_link, bs.whatsapp_group_link),
  program_kind = coalesce(s.program_kind, bs.program_kind),
  black_since = coalesce(s.black_since, bs.start_date),
  black_last_active_at = coalesce(s.black_last_active_at, bs.last_active_at),
  black_last_contacted_at = coalesce(s.black_last_contacted_at, bs.last_contacted_at),
  black_status = coalesce(s.black_status, bs.status),
  initial_avg = coalesce(s.initial_avg, bs.initial_avg),
  black_tutor_id = coalesce(s.black_tutor_id, bs.tutor_id::text),
  response_status = coalesce(nullif(s.response_status, ''), bs.response_status, 'new'),
  responded_at = coalesce(s.responded_at, bs.responded_at),
  no_response_at = coalesce(s.no_response_at, bs.no_response_at),
  paused_at = coalesce(s.paused_at, bs.paused_at),
  preferred_name_updated_at = coalesce(s.preferred_name_updated_at, bs.preferred_name_updated_at),
  updated_at = now()
from public.black_students bs
where bs.student_id = s.id;

create or replace function public.resolve_canonical_student_id(_student uuid)
returns uuid
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select s.id from public.students s where s.id = _student limit 1),
    (select s.id from public.students s where s.legacy_black_student_id = _student limit 1)
  )
$$;

create table if not exists public.black_students_legacy_archive_20260626 as
select *
from public.black_students
where false;

insert into public.black_students_legacy_archive_20260626
select bs.*
from public.black_students bs
where not exists (
  select 1
  from public.black_students_legacy_archive_20260626 archive
  where archive.id = bs.id
);

drop view if exists public.black_events_feed;
drop view if exists public.black_student_card;
drop view if exists public.student_access_state;

drop trigger if exists sync_student_from_legacy_black_student_trg on public.black_students;
drop function if exists public.sync_student_from_legacy_black_student();

drop trigger if exists black_assessments_set_canonical_student_id on public.black_assessments;
drop trigger if exists black_grades_set_canonical_student_id on public.black_grades;
drop trigger if exists black_notes_set_canonical_student_id on public.black_notes;
drop trigger if exists black_contact_logs_set_canonical_student_id on public.black_contact_logs;
drop trigger if exists black_student_brief_set_canonical_student_id on public.black_student_brief;
drop trigger if exists black_stripe_signups_set_canonical_student_id on public.black_stripe_signups;
drop trigger if exists black_whatsapp_conversations_set_canonical_student_id on public.black_whatsapp_conversations;
drop trigger if exists black_whatsapp_messages_set_canonical_student_id on public.black_whatsapp_messages;
drop trigger if exists black_followups_set_canonical_student_id on public.black_followups;
drop trigger if exists tutor_assignments_set_canonical_student_id on public.tutor_assignments;
drop trigger if exists tutor_sessions_set_canonical_student_id on public.tutor_sessions;
drop function if exists public.set_canonical_student_id_from_legacy_black();

alter table public.black_assessments drop constraint if exists black_assessments_student_id_fkey;
alter table public.black_grades drop constraint if exists black_grades_student_id_fkey;
alter table public.black_notes drop constraint if exists black_notes_student_id_fkey;
alter table public.black_contact_logs drop constraint if exists black_contact_logs_student_id_fkey;
alter table public.black_student_brief drop constraint if exists black_student_brief_student_id_fkey;
alter table public.black_stripe_signups drop constraint if exists black_stripe_signups_student_id_fkey;
alter table public.black_whatsapp_conversations drop constraint if exists black_whatsapp_conversations_student_id_fkey;
alter table public.black_whatsapp_messages drop constraint if exists black_whatsapp_messages_student_id_fkey;
alter table public.black_followups drop constraint if exists black_followups_student_id_fkey;
alter table public.tutor_assignments drop constraint if exists tutor_assignments_student_id_fkey;
alter table public.tutor_sessions drop constraint if exists tutor_sessions_student_id_fkey;

update public.black_assessments
set canonical_student_id = coalesce(canonical_student_id, public.resolve_canonical_student_id(student_id));
update public.black_assessments set student_id = canonical_student_id where canonical_student_id is not null;

update public.black_grades
set canonical_student_id = coalesce(canonical_student_id, public.resolve_canonical_student_id(student_id));
update public.black_grades set student_id = canonical_student_id where canonical_student_id is not null;

update public.black_notes
set canonical_student_id = coalesce(canonical_student_id, public.resolve_canonical_student_id(student_id));
update public.black_notes set student_id = canonical_student_id where canonical_student_id is not null;

update public.black_contact_logs
set canonical_student_id = coalesce(canonical_student_id, public.resolve_canonical_student_id(student_id));
update public.black_contact_logs set student_id = canonical_student_id where canonical_student_id is not null;

update public.black_student_brief
set canonical_student_id = coalesce(canonical_student_id, public.resolve_canonical_student_id(student_id));
update public.black_student_brief set student_id = canonical_student_id where canonical_student_id is not null;

update public.black_stripe_signups
set canonical_student_id = coalesce(canonical_student_id, public.resolve_canonical_student_id(student_id))
where student_id is not null;
update public.black_stripe_signups set student_id = canonical_student_id where canonical_student_id is not null;

update public.black_whatsapp_conversations
set canonical_student_id = coalesce(canonical_student_id, public.resolve_canonical_student_id(student_id))
where student_id is not null;
update public.black_whatsapp_conversations set student_id = canonical_student_id where canonical_student_id is not null;

update public.black_whatsapp_messages
set canonical_student_id = coalesce(canonical_student_id, public.resolve_canonical_student_id(student_id))
where student_id is not null;
update public.black_whatsapp_messages set student_id = canonical_student_id where canonical_student_id is not null;

update public.black_followups
set canonical_student_id = coalesce(canonical_student_id, public.resolve_canonical_student_id(student_id))
where student_id is not null;
update public.black_followups set student_id = canonical_student_id where canonical_student_id is not null;

update public.tutor_assignments
set canonical_student_id = coalesce(canonical_student_id, public.resolve_canonical_student_id(student_id));
update public.tutor_assignments set student_id = canonical_student_id where canonical_student_id is not null;

update public.tutor_sessions
set canonical_student_id = coalesce(canonical_student_id, public.resolve_canonical_student_id(student_id));
update public.tutor_sessions set student_id = canonical_student_id where canonical_student_id is not null;

alter table public.black_assessments
  add constraint black_assessments_student_id_fkey
  foreign key (student_id) references public.students(id) on delete cascade not valid;
alter table public.black_grades
  add constraint black_grades_student_id_fkey
  foreign key (student_id) references public.students(id) on delete cascade not valid;
alter table public.black_notes
  add constraint black_notes_student_id_fkey
  foreign key (student_id) references public.students(id) on delete cascade not valid;
alter table public.black_contact_logs
  add constraint black_contact_logs_student_id_fkey
  foreign key (student_id) references public.students(id) on delete cascade not valid;
alter table public.black_student_brief
  add constraint black_student_brief_student_id_fkey
  foreign key (student_id) references public.students(id) on delete cascade not valid;
alter table public.black_stripe_signups
  add constraint black_stripe_signups_student_id_fkey
  foreign key (student_id) references public.students(id) on delete set null not valid;
alter table public.black_whatsapp_conversations
  add constraint black_whatsapp_conversations_student_id_fkey
  foreign key (student_id) references public.students(id) on delete set null not valid;
alter table public.black_whatsapp_messages
  add constraint black_whatsapp_messages_student_id_fkey
  foreign key (student_id) references public.students(id) on delete set null not valid;
alter table public.black_followups
  add constraint black_followups_student_id_fkey
  foreign key (student_id) references public.students(id) on delete set null not valid;
alter table public.tutor_assignments
  add constraint tutor_assignments_student_id_fkey
  foreign key (student_id) references public.students(id) on delete cascade not valid;
alter table public.tutor_sessions
  add constraint tutor_sessions_student_id_fkey
  foreign key (student_id) references public.students(id) on delete cascade not valid;

drop table if exists public.black_students;

create or replace view public.black_students as
select
  s.id,
  s.auth_uid as user_id,
  s.id as student_id,
  coalesce(s.preferred_name, s.full_name) as student_name,
  s.preferred_name,
  s.preferred_name_updated_at,
  s.student_email,
  s.student_phone,
  s.parent_name,
  s.parent_email,
  s.parent_phone,
  s.year_class,
  s.track,
  s.black_since as start_date,
  s.goal,
  s.difficulty_focus,
  s.black_tutor_id as tutor_id,
  coalesce(s.black_status, s.subscription_status, case when s.black_active then 'active' else 'inactive' end) as status,
  s.initial_avg,
  s.readiness,
  s.risk_level,
  s.ai_description,
  s.next_assessment_subject,
  s.next_assessment_date,
  s.videolesson_tutor_id,
  s.hours_paid,
  s.hours_consumed,
  s.whatsapp_group_link,
  s.program_kind,
  s.response_status,
  s.responded_at,
  s.no_response_at,
  s.paused_at,
  s.black_last_active_at as last_active_at,
  s.black_last_contacted_at as last_contacted_at,
  s.created_at,
  s.updated_at
from public.students s
where s.legacy_black_student_id is not null
   or s.subscription_tier = 'black'
   or s.black_active is true
   or s.program_kind is not null;

create or replace function public.black_students_view_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  v_id := coalesce(new.student_id, new.id, gen_random_uuid());

  insert into public.students (
    id,
    auth_uid,
    full_name,
    preferred_name,
    preferred_name_updated_at,
    student_email,
    student_phone,
    parent_name,
    parent_email,
    parent_phone,
    year_class,
    track,
    black_since,
    goal,
    difficulty_focus,
    black_tutor_id,
    black_status,
    initial_avg,
    readiness,
    risk_level,
    ai_description,
    next_assessment_subject,
    next_assessment_date,
    videolesson_tutor_id,
    hours_paid,
    hours_consumed,
    whatsapp_group_link,
    program_kind,
    response_status,
    responded_at,
    no_response_at,
    paused_at,
    black_last_active_at,
    black_last_contacted_at,
    source,
    updated_at
  )
  values (
    v_id,
    new.user_id,
    coalesce(new.student_name, new.preferred_name, new.student_email, new.parent_email),
    coalesce(new.preferred_name, new.student_name),
    new.preferred_name_updated_at,
    new.student_email,
    new.student_phone,
    new.parent_name,
    new.parent_email,
    new.parent_phone,
    new.year_class,
    new.track,
    new.start_date,
    new.goal,
    new.difficulty_focus,
    new.tutor_id,
    new.status,
    new.initial_avg,
    new.readiness,
    new.risk_level,
    new.ai_description,
    new.next_assessment_subject,
    new.next_assessment_date,
    new.videolesson_tutor_id,
    coalesce(new.hours_paid, 0),
    coalesce(new.hours_consumed, 0),
    new.whatsapp_group_link,
    coalesce(new.program_kind, 'subscription'),
    coalesce(new.response_status, 'new'),
    new.responded_at,
    new.no_response_at,
    new.paused_at,
    new.last_active_at,
    new.last_contacted_at,
    'black_students_compat_view',
    now()
  )
  on conflict (id) do update set
    auth_uid = coalesce(excluded.auth_uid, students.auth_uid),
    full_name = coalesce(excluded.full_name, students.full_name),
    preferred_name = coalesce(excluded.preferred_name, students.preferred_name),
    preferred_name_updated_at = coalesce(excluded.preferred_name_updated_at, students.preferred_name_updated_at),
    student_email = coalesce(excluded.student_email, students.student_email),
    student_phone = coalesce(excluded.student_phone, students.student_phone),
    parent_name = coalesce(excluded.parent_name, students.parent_name),
    parent_email = coalesce(excluded.parent_email, students.parent_email),
    parent_phone = coalesce(excluded.parent_phone, students.parent_phone),
    year_class = coalesce(excluded.year_class, students.year_class),
    track = coalesce(excluded.track, students.track),
    black_since = coalesce(excluded.black_since, students.black_since),
    goal = coalesce(excluded.goal, students.goal),
    difficulty_focus = coalesce(excluded.difficulty_focus, students.difficulty_focus),
    black_tutor_id = coalesce(excluded.black_tutor_id, students.black_tutor_id),
    black_status = coalesce(excluded.black_status, students.black_status),
    initial_avg = coalesce(excluded.initial_avg, students.initial_avg),
    readiness = coalesce(excluded.readiness, students.readiness),
    risk_level = coalesce(excluded.risk_level, students.risk_level),
    ai_description = coalesce(excluded.ai_description, students.ai_description),
    next_assessment_subject = coalesce(excluded.next_assessment_subject, students.next_assessment_subject),
    next_assessment_date = coalesce(excluded.next_assessment_date, students.next_assessment_date),
    videolesson_tutor_id = coalesce(excluded.videolesson_tutor_id, students.videolesson_tutor_id),
    hours_paid = coalesce(excluded.hours_paid, students.hours_paid, 0),
    hours_consumed = coalesce(excluded.hours_consumed, students.hours_consumed, 0),
    whatsapp_group_link = coalesce(excluded.whatsapp_group_link, students.whatsapp_group_link),
    program_kind = coalesce(excluded.program_kind, students.program_kind),
    response_status = coalesce(excluded.response_status, students.response_status, 'new'),
    responded_at = coalesce(excluded.responded_at, students.responded_at),
    no_response_at = coalesce(excluded.no_response_at, students.no_response_at),
    paused_at = coalesce(excluded.paused_at, students.paused_at),
    black_last_active_at = coalesce(excluded.black_last_active_at, students.black_last_active_at),
    black_last_contacted_at = coalesce(excluded.black_last_contacted_at, students.black_last_contacted_at),
    updated_at = now();

  new.id := v_id;
  new.student_id := v_id;
  return new;
end;
$$;

create or replace function public.black_students_view_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  v_id := coalesce(public.resolve_canonical_student_id(old.id), public.resolve_canonical_student_id(new.id), new.student_id);
  if v_id is null then
    raise exception 'canonical student not found for black_students view update';
  end if;

  update public.students
  set
    auth_uid = coalesce(new.user_id, auth_uid),
    full_name = coalesce(new.student_name, new.preferred_name, full_name),
    preferred_name = new.preferred_name,
    preferred_name_updated_at = new.preferred_name_updated_at,
    student_email = new.student_email,
    student_phone = new.student_phone,
    parent_name = new.parent_name,
    parent_email = new.parent_email,
    parent_phone = new.parent_phone,
    year_class = new.year_class,
    track = new.track,
    black_since = new.start_date,
    goal = new.goal,
    difficulty_focus = new.difficulty_focus,
    black_tutor_id = new.tutor_id,
    black_status = new.status,
    initial_avg = new.initial_avg,
    readiness = new.readiness,
    risk_level = new.risk_level,
    ai_description = new.ai_description,
    next_assessment_subject = new.next_assessment_subject,
    next_assessment_date = new.next_assessment_date,
    videolesson_tutor_id = new.videolesson_tutor_id,
    hours_paid = coalesce(new.hours_paid, 0),
    hours_consumed = coalesce(new.hours_consumed, 0),
    whatsapp_group_link = new.whatsapp_group_link,
    program_kind = new.program_kind,
    response_status = coalesce(new.response_status, 'new'),
    responded_at = new.responded_at,
    no_response_at = new.no_response_at,
    paused_at = new.paused_at,
    black_last_active_at = new.last_active_at,
    black_last_contacted_at = new.last_contacted_at,
    updated_at = now()
  where id = v_id;

  new.id := v_id;
  new.student_id := v_id;
  return new;
end;
$$;

create or replace function public.black_students_view_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.students
  set
    black_status = 'archived',
    program_kind = coalesce(program_kind, 'archived'),
    updated_at = now()
  where id = old.id;
  return old;
end;
$$;

create trigger black_students_view_insert_trg
instead of insert on public.black_students
for each row execute function public.black_students_view_insert();

create trigger black_students_view_update_trg
instead of update on public.black_students
for each row execute function public.black_students_view_update();

create trigger black_students_view_delete_trg
instead of delete on public.black_students
for each row execute function public.black_students_view_delete();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'black_students_user_id_fkey') then
    alter table public.students
      add constraint black_students_user_id_fkey
      foreign key (auth_uid) references public.profiles(id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'black_students_tutor_id_fkey') then
    alter table public.students
      add constraint black_students_tutor_id_fkey
      foreign key (black_tutor_id) references public.profiles(id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'black_students_videolesson_tutor_id_fkey') then
    alter table public.students
      add constraint black_students_videolesson_tutor_id_fkey
      foreign key (videolesson_tutor_id) references public.tutors(id) not valid;
  end if;
end $$;

create or replace view public.student_access_state as
select
  s.id as student_id,
  s.auth_uid,
  s.email,
  s.full_name,
  s.subscription_tier,
  s.subscription_status,
  s.black_active,
  s.stripe_customer_id,
  s.stripe_subscription_id,
  s.stripe_price_id,
  s.stripe_current_period_end,
  s.stripe_cancel_at_period_end,
  s.stripe_canceled_at,
  s.black_since,
  s.black_last_active_at,
  s.black_last_contacted_at,
  p.subscription_tier as profile_subscription_tier,
  p.stripe_subscription_status as profile_subscription_status,
  s.id as black_student_id,
  coalesce(s.black_status, s.subscription_status, case when s.black_active then 'active' else 'inactive' end) as black_student_status
from public.students s
left join public.profiles p
  on p.id = s.auth_uid;

create or replace view public.black_student_card as
select
  s.id as student_id,
  s.auth_uid as user_id,
  coalesce(s.preferred_name, s.full_name, s.student_email, s.parent_email) as student_name,
  p.role as user_role,
  s.subscription_tier,
  s.year_class,
  s.track,
  s.black_since as start_date,
  s.goal,
  s.difficulty_focus,
  s.parent_name,
  s.parent_phone,
  s.parent_email,
  s.student_phone,
  s.student_email,
  s.black_tutor_id as tutor_id,
  tp.full_name as tutor_name,
  tp.email as tutor_email,
  coalesce(s.black_status, s.subscription_status, case when s.black_active then 'active' else 'inactive' end) as status,
  s.initial_avg,
  gm.current_avg,
  gm.grades_count,
  lg.subject as last_grade_subject,
  lg.score as last_grade_score,
  lg.max_score as last_grade_max,
  lg.when_at as last_grade_date,
  coalesce(na.subject, s.next_assessment_subject) as next_assessment_subject,
  coalesce(na.when_at, s.next_assessment_date) as next_assessment_date,
  s.readiness,
  s.risk_level,
  s.ai_description,
  s.black_last_contacted_at as last_contacted_at,
  s.black_last_active_at as last_active_at,
  s.updated_at
from public.students s
left join public.profiles p on p.id = s.auth_uid
left join public.profiles tp on tp.id = s.black_tutor_id
left join lateral (
  select
    round(avg(case when bg.max_score is not null and bg.max_score <> 0 then bg.score / bg.max_score * 10 else bg.score end), 2) as current_avg,
    count(*)::bigint as grades_count
  from public.black_grades bg
  where coalesce(bg.canonical_student_id, bg.student_id) = s.id
) gm on true
left join lateral (
  select bg.subject, bg.score, bg.max_score, bg.when_at
  from public.black_grades bg
  where coalesce(bg.canonical_student_id, bg.student_id) = s.id
  order by bg.when_at desc nulls last, bg.created_at desc
  limit 1
) lg on true
left join lateral (
  select ba.subject, ba.when_at
  from public.black_assessments ba
  where coalesce(ba.canonical_student_id, ba.student_id) = s.id
    and ba.when_at >= current_date
  order by ba.when_at asc
  limit 1
) na on true
where s.legacy_black_student_id is not null
   or s.subscription_tier = 'black'
   or s.black_active is true
   or s.program_kind is not null;

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
  where s.legacy_black_student_id is not null
     or s.subscription_tier = 'black'
     or s.black_active is true
     or s.program_kind is not null
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

create or replace function public.refresh_black_brief(_student uuid, _ai_desc text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid;
  v_brief text;
begin
  v_student := public.resolve_canonical_student_id(_student);
  if v_student is null then
    return;
  end if;

  select concat_ws(E'\n',
    '# Scheda Black',
    'Nome: ' || coalesce(s.preferred_name, s.full_name, s.student_email, s.parent_email, 'Studente'),
    'Classe: ' || coalesce(s.year_class, 'n/d'),
    'Track: ' || coalesce(s.track, 'n/d'),
    'Obiettivo: ' || coalesce(s.goal, 'n/d'),
    'Focus: ' || coalesce(s.difficulty_focus, 'n/d'),
    'Readiness: ' || coalesce(s.readiness::text, 'n/d'),
    'Rischio: ' || coalesce(s.risk_level, 'n/d'),
    'Prossima verifica: ' || coalesce(s.next_assessment_subject, 'n/d') || ' ' || coalesce(s.next_assessment_date::text, ''),
    'AI: ' || coalesce(_ai_desc, s.ai_description, 'n/d')
  )
  into v_brief
  from public.students s
  where s.id = v_student;

  if v_brief is null then
    return;
  end if;

  insert into public.black_student_brief (student_id, canonical_student_id, brief_md, updated_at, version)
  values (v_student, v_student, v_brief, now(), 1)
  on conflict (student_id) do update set
    canonical_student_id = excluded.canonical_student_id,
    brief_md = excluded.brief_md,
    updated_at = excluded.updated_at,
    version = public.black_student_brief.version + 1;
end;
$$;

alter table public.black_assessments validate constraint black_assessments_student_id_fkey;
alter table public.black_grades validate constraint black_grades_student_id_fkey;
alter table public.black_notes validate constraint black_notes_student_id_fkey;
alter table public.black_contact_logs validate constraint black_contact_logs_student_id_fkey;
alter table public.black_student_brief validate constraint black_student_brief_student_id_fkey;
alter table public.black_stripe_signups validate constraint black_stripe_signups_student_id_fkey;
alter table public.black_whatsapp_conversations validate constraint black_whatsapp_conversations_student_id_fkey;
alter table public.black_whatsapp_messages validate constraint black_whatsapp_messages_student_id_fkey;
alter table public.black_followups validate constraint black_followups_student_id_fkey;
alter table public.tutor_assignments validate constraint tutor_assignments_student_id_fkey;
alter table public.tutor_sessions validate constraint tutor_sessions_student_id_fkey;
