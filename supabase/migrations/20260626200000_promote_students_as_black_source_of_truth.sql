alter table public.students
  add column if not exists preferred_name text,
  add column if not exists student_email text,
  add column if not exists student_phone text,
  add column if not exists parent_name text,
  add column if not exists parent_email text,
  add column if not exists parent_phone text,
  add column if not exists year_class text,
  add column if not exists track text,
  add column if not exists goal text,
  add column if not exists difficulty_focus text,
  add column if not exists readiness integer,
  add column if not exists risk_level text,
  add column if not exists ai_description text,
  add column if not exists next_assessment_subject text,
  add column if not exists next_assessment_date date,
  add column if not exists videolesson_tutor_id uuid,
  add column if not exists hours_paid numeric(6,2) default 0,
  add column if not exists hours_consumed numeric(6,2) default 0,
  add column if not exists whatsapp_group_link text,
  add column if not exists program_kind text,
  add column if not exists legacy_black_student_id uuid;

create unique index if not exists students_legacy_black_student_id_key
  on public.students (legacy_black_student_id)
  where legacy_black_student_id is not null;

update public.students s
set
  legacy_black_student_id = coalesce(s.legacy_black_student_id, bs.id),
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
  updated_at = now()
from public.black_students bs
where bs.student_id = s.id;

create or replace function public.sync_student_from_legacy_black_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.student_id is null then
    return new;
  end if;

  update public.students
  set
    legacy_black_student_id = new.id,
    preferred_name = coalesce(new.preferred_name, new.student_name, preferred_name),
    student_email = coalesce(new.student_email, student_email),
    student_phone = coalesce(new.student_phone, student_phone),
    parent_name = coalesce(new.parent_name, parent_name),
    parent_email = coalesce(new.parent_email, parent_email),
    parent_phone = coalesce(new.parent_phone, parent_phone),
    year_class = coalesce(new.year_class, year_class),
    track = coalesce(new.track, track),
    goal = coalesce(new.goal, goal),
    difficulty_focus = coalesce(new.difficulty_focus, difficulty_focus),
    readiness = coalesce(new.readiness, readiness),
    risk_level = coalesce(new.risk_level, risk_level),
    ai_description = coalesce(new.ai_description, ai_description),
    next_assessment_subject = coalesce(new.next_assessment_subject, next_assessment_subject),
    next_assessment_date = coalesce(new.next_assessment_date, next_assessment_date),
    videolesson_tutor_id = coalesce(new.videolesson_tutor_id, videolesson_tutor_id),
    hours_paid = coalesce(new.hours_paid, hours_paid, 0),
    hours_consumed = coalesce(new.hours_consumed, hours_consumed, 0),
    whatsapp_group_link = coalesce(new.whatsapp_group_link, whatsapp_group_link),
    program_kind = coalesce(new.program_kind, program_kind),
    black_since = coalesce(new.start_date, black_since),
    black_last_active_at = coalesce(new.last_active_at, black_last_active_at),
    black_last_contacted_at = coalesce(new.last_contacted_at, black_last_contacted_at),
    updated_at = now()
  where id = new.student_id;

  return new;
end;
$$;

drop trigger if exists sync_student_from_legacy_black_student_trg on public.black_students;
create trigger sync_student_from_legacy_black_student_trg
after insert or update on public.black_students
for each row
execute function public.sync_student_from_legacy_black_student();

alter table public.black_assessments add column if not exists canonical_student_id uuid;
alter table public.black_grades add column if not exists canonical_student_id uuid;
alter table public.black_notes add column if not exists canonical_student_id uuid;
alter table public.black_contact_logs add column if not exists canonical_student_id uuid;
alter table public.black_student_brief add column if not exists canonical_student_id uuid;
alter table public.black_stripe_signups add column if not exists canonical_student_id uuid;
alter table public.black_whatsapp_conversations add column if not exists canonical_student_id uuid;
alter table public.black_whatsapp_messages add column if not exists canonical_student_id uuid;
alter table public.black_followups add column if not exists canonical_student_id uuid;
alter table public.tutor_assignments add column if not exists canonical_student_id uuid;
alter table public.tutor_sessions add column if not exists canonical_student_id uuid;

update public.black_assessments t set canonical_student_id = bs.student_id
from public.black_students bs
where t.student_id = bs.id and t.canonical_student_id is null and bs.student_id is not null;

update public.black_grades t set canonical_student_id = bs.student_id
from public.black_students bs
where t.student_id = bs.id and t.canonical_student_id is null and bs.student_id is not null;

update public.black_notes t set canonical_student_id = bs.student_id
from public.black_students bs
where t.student_id = bs.id and t.canonical_student_id is null and bs.student_id is not null;

update public.black_contact_logs t set canonical_student_id = bs.student_id
from public.black_students bs
where t.student_id = bs.id and t.canonical_student_id is null and bs.student_id is not null;

update public.black_student_brief t set canonical_student_id = bs.student_id
from public.black_students bs
where t.student_id = bs.id and t.canonical_student_id is null and bs.student_id is not null;

update public.black_stripe_signups t set canonical_student_id = bs.student_id
from public.black_students bs
where t.student_id = bs.id and t.canonical_student_id is null and bs.student_id is not null;

update public.black_whatsapp_conversations t set canonical_student_id = bs.student_id
from public.black_students bs
where t.student_id = bs.id and t.canonical_student_id is null and bs.student_id is not null;

update public.black_whatsapp_messages t set canonical_student_id = bs.student_id
from public.black_students bs
where t.student_id = bs.id and t.canonical_student_id is null and bs.student_id is not null;

update public.black_followups t set canonical_student_id = bs.student_id
from public.black_students bs
where t.student_id = bs.id and t.canonical_student_id is null and bs.student_id is not null;

update public.tutor_assignments t set canonical_student_id = bs.student_id
from public.black_students bs
where t.student_id = bs.id and t.canonical_student_id is null and bs.student_id is not null;

update public.tutor_sessions t set canonical_student_id = bs.student_id
from public.black_students bs
where t.student_id = bs.id and t.canonical_student_id is null and bs.student_id is not null;

create index if not exists black_assessments_canonical_student_id_idx on public.black_assessments (canonical_student_id);
create index if not exists black_grades_canonical_student_id_idx on public.black_grades (canonical_student_id);
create index if not exists black_notes_canonical_student_id_idx on public.black_notes (canonical_student_id);
create index if not exists black_contact_logs_canonical_student_id_idx on public.black_contact_logs (canonical_student_id);
create index if not exists black_student_brief_canonical_student_id_idx on public.black_student_brief (canonical_student_id);
create index if not exists black_stripe_signups_canonical_student_id_idx on public.black_stripe_signups (canonical_student_id);
create index if not exists black_whatsapp_conversations_canonical_student_id_idx on public.black_whatsapp_conversations (canonical_student_id);
create index if not exists black_whatsapp_messages_canonical_student_id_idx on public.black_whatsapp_messages (canonical_student_id);
create index if not exists black_followups_canonical_student_id_idx on public.black_followups (canonical_student_id);
create index if not exists tutor_assignments_canonical_student_id_idx on public.tutor_assignments (canonical_student_id);
create index if not exists tutor_sessions_canonical_student_id_idx on public.tutor_sessions (canonical_student_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'black_assessments_canonical_student_id_fkey') then
    alter table public.black_assessments add constraint black_assessments_canonical_student_id_fkey foreign key (canonical_student_id) references public.students(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'black_grades_canonical_student_id_fkey') then
    alter table public.black_grades add constraint black_grades_canonical_student_id_fkey foreign key (canonical_student_id) references public.students(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'black_notes_canonical_student_id_fkey') then
    alter table public.black_notes add constraint black_notes_canonical_student_id_fkey foreign key (canonical_student_id) references public.students(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'black_contact_logs_canonical_student_id_fkey') then
    alter table public.black_contact_logs add constraint black_contact_logs_canonical_student_id_fkey foreign key (canonical_student_id) references public.students(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'black_student_brief_canonical_student_id_fkey') then
    alter table public.black_student_brief add constraint black_student_brief_canonical_student_id_fkey foreign key (canonical_student_id) references public.students(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'black_stripe_signups_canonical_student_id_fkey') then
    alter table public.black_stripe_signups add constraint black_stripe_signups_canonical_student_id_fkey foreign key (canonical_student_id) references public.students(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'black_whatsapp_conversations_canonical_student_id_fkey') then
    alter table public.black_whatsapp_conversations add constraint black_whatsapp_conversations_canonical_student_id_fkey foreign key (canonical_student_id) references public.students(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'black_whatsapp_messages_canonical_student_id_fkey') then
    alter table public.black_whatsapp_messages add constraint black_whatsapp_messages_canonical_student_id_fkey foreign key (canonical_student_id) references public.students(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'black_followups_canonical_student_id_fkey') then
    alter table public.black_followups add constraint black_followups_canonical_student_id_fkey foreign key (canonical_student_id) references public.students(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tutor_assignments_canonical_student_id_fkey') then
    alter table public.tutor_assignments add constraint tutor_assignments_canonical_student_id_fkey foreign key (canonical_student_id) references public.students(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tutor_sessions_canonical_student_id_fkey') then
    alter table public.tutor_sessions add constraint tutor_sessions_canonical_student_id_fkey foreign key (canonical_student_id) references public.students(id) on delete cascade not valid;
  end if;
end $$;

create or replace function public.set_canonical_student_id_from_legacy_black()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.canonical_student_id is null and new.student_id is not null then
    select bs.student_id
      into new.canonical_student_id
    from public.black_students bs
    where bs.id = new.student_id;
  end if;
  return new;
end;
$$;

drop trigger if exists black_assessments_set_canonical_student_id on public.black_assessments;
create trigger black_assessments_set_canonical_student_id before insert or update on public.black_assessments for each row execute function public.set_canonical_student_id_from_legacy_black();
drop trigger if exists black_grades_set_canonical_student_id on public.black_grades;
create trigger black_grades_set_canonical_student_id before insert or update on public.black_grades for each row execute function public.set_canonical_student_id_from_legacy_black();
drop trigger if exists black_notes_set_canonical_student_id on public.black_notes;
create trigger black_notes_set_canonical_student_id before insert or update on public.black_notes for each row execute function public.set_canonical_student_id_from_legacy_black();
drop trigger if exists black_contact_logs_set_canonical_student_id on public.black_contact_logs;
create trigger black_contact_logs_set_canonical_student_id before insert or update on public.black_contact_logs for each row execute function public.set_canonical_student_id_from_legacy_black();
drop trigger if exists black_student_brief_set_canonical_student_id on public.black_student_brief;
create trigger black_student_brief_set_canonical_student_id before insert or update on public.black_student_brief for each row execute function public.set_canonical_student_id_from_legacy_black();
drop trigger if exists black_stripe_signups_set_canonical_student_id on public.black_stripe_signups;
create trigger black_stripe_signups_set_canonical_student_id before insert or update on public.black_stripe_signups for each row execute function public.set_canonical_student_id_from_legacy_black();
drop trigger if exists black_whatsapp_conversations_set_canonical_student_id on public.black_whatsapp_conversations;
create trigger black_whatsapp_conversations_set_canonical_student_id before insert or update on public.black_whatsapp_conversations for each row execute function public.set_canonical_student_id_from_legacy_black();
drop trigger if exists black_whatsapp_messages_set_canonical_student_id on public.black_whatsapp_messages;
create trigger black_whatsapp_messages_set_canonical_student_id before insert or update on public.black_whatsapp_messages for each row execute function public.set_canonical_student_id_from_legacy_black();
drop trigger if exists black_followups_set_canonical_student_id on public.black_followups;
create trigger black_followups_set_canonical_student_id before insert or update on public.black_followups for each row execute function public.set_canonical_student_id_from_legacy_black();
drop trigger if exists tutor_assignments_set_canonical_student_id on public.tutor_assignments;
create trigger tutor_assignments_set_canonical_student_id before insert or update on public.tutor_assignments for each row execute function public.set_canonical_student_id_from_legacy_black();
drop trigger if exists tutor_sessions_set_canonical_student_id on public.tutor_sessions;
create trigger tutor_sessions_set_canonical_student_id before insert or update on public.tutor_sessions for each row execute function public.set_canonical_student_id_from_legacy_black();
