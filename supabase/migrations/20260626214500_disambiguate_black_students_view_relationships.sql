drop view if exists public.black_students cascade;

create or replace view public.black_students as
select
  s.id,
  s.auth_uid as user_id,
  s.id::text as student_id,
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

create or replace function public.uuid_or_null(value text)
returns uuid
language sql
immutable
as $$
  select case
    when value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then value::uuid
    else null
  end
$$;

create or replace function public.black_students_view_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  v_id := coalesce(public.uuid_or_null(new.student_id), new.id, gen_random_uuid());

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
  new.student_id := v_id::text;
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
  v_id := coalesce(public.resolve_canonical_student_id(old.id), public.resolve_canonical_student_id(new.id), public.uuid_or_null(new.student_id));
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
  new.student_id := v_id::text;
  return new;
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
