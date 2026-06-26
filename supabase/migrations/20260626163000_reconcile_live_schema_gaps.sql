-- Reconcile objects found in the live Supabase schema but missing from the
-- versioned SQL files in this repository.
--
-- This migration is intentionally additive and idempotent. It must not delete
-- or rewrite existing production data.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Columns used by the app but not present in the older local SQL snapshots.
alter table if exists public.black_students
  add column if not exists student_name text,
  add column if not exists whatsapp_group_link text,
  add column if not exists response_status text not null default 'pending',
  add column if not exists responded_at timestamptz,
  add column if not exists no_response_at timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists student_id uuid references public.students(id),
  add column if not exists program_kind text;

alter table if exists public.tutor_assignments
  add column if not exists consumed_baseline numeric not null default 0;

create index if not exists black_students_response_status_idx
  on public.black_students (response_status);

create unique index if not exists black_students_student_id_key
  on public.black_students (student_id)
  where student_id is not null;

create index if not exists black_students_student_id_idx
  on public.black_students (student_id);

-- WhatsApp bot/conversation state.
create table if not exists public.black_whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.black_students(id) on delete set null,
  phone_tail text,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists black_whatsapp_messages_student_id_idx
  on public.black_whatsapp_messages (student_id, created_at desc);

create index if not exists black_whatsapp_messages_phone_tail_idx
  on public.black_whatsapp_messages (phone_tail, created_at desc);

create table if not exists public.black_whatsapp_inquiries (
  id uuid primary key default gen_random_uuid(),
  phone_tail text unique not null,
  intent text not null default 'info',
  status text not null default 'open',
  email text,
  message_count integer default 0,
  meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz
);

create unique index if not exists black_whatsapp_inquiries_phone_tail_key
  on public.black_whatsapp_inquiries (phone_tail);

drop trigger if exists trg_black_whatsapp_inquiries_set_updated_at
  on public.black_whatsapp_inquiries;
create trigger trg_black_whatsapp_inquiries_set_updated_at
before update on public.black_whatsapp_inquiries
for each row
execute function public.set_updated_at();

create table if not exists public.black_whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  phone_tail text unique not null,
  phone_e164 text,
  student_id uuid references public.black_students(id) on delete set null,
  status text not null default 'waiting_tutor'
    check (status in ('bot', 'waiting_tutor', 'tutor')),
  type text not null default 'prospect'
    check (type in ('black', 'prospect', 'genitore', 'insegnante', 'altro')),
  bot text,
  last_message_at timestamptz,
  last_message_preview text,
  followup_due_at timestamptz,
  followup_sent_at timestamptz,
  plan_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.black_whatsapp_conversations
  add column if not exists followup_due_at timestamptz,
  add column if not exists followup_sent_at timestamptz,
  add column if not exists plan_label text;

create index if not exists black_whatsapp_conversations_status_idx
  on public.black_whatsapp_conversations (status, type);

create index if not exists black_whatsapp_conversations_followup_idx
  on public.black_whatsapp_conversations (status, type, followup_due_at)
  where followup_due_at is not null and followup_sent_at is null;

drop trigger if exists trg_black_whatsapp_conversations_set_updated_at
  on public.black_whatsapp_conversations;
create trigger trg_black_whatsapp_conversations_set_updated_at
before update on public.black_whatsapp_conversations
for each row
execute function public.set_updated_at();

-- Date-specific editorial plans. The older table content_editorial_plan stores
-- one target per format; this table stores targets per day.
create table if not exists public.content_editorial_plans (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null,
  format text not null references public.content_short_video_formats(name)
    on update cascade on delete restrict,
  video_count integer not null check (video_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_date, format)
);

create index if not exists content_editorial_plans_date_idx
  on public.content_editorial_plans (plan_date);

create index if not exists content_editorial_plans_format_idx
  on public.content_editorial_plans (format);

drop trigger if exists trg_content_editorial_plans_set_updated_at
  on public.content_editorial_plans;
create trigger trg_content_editorial_plans_set_updated_at
before update on public.content_editorial_plans
for each row
execute function public.set_updated_at();

create or replace view public.call_slots_available as
select
  s.id as slot_id,
  s.starts_at,
  s.ends_at,
  s.status,
  s.tutor_id,
  coalesce(t.display_name, t.full_name, t.email) as tutor_name,
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

-- Operational card consumed by the Telegram digest and bot.
drop view if exists public.black_student_card;
create view public.black_student_card as
select
  bs.id as student_id,
  bs.user_id,
  coalesce(bs.preferred_name, bs.student_name, p.full_name, bs.student_email, bs.parent_email) as student_name,
  p.role as user_role,
  p.subscription_tier,
  bs.year_class,
  bs.track,
  bs.start_date,
  bs.goal,
  bs.difficulty_focus,
  bs.parent_name,
  bs.parent_phone,
  bs.parent_email,
  bs.student_phone,
  bs.student_email,
  bs.tutor_id,
  tp.full_name as tutor_name,
  tp.email as tutor_email,
  bs.status,
  bs.initial_avg,
  gm.current_avg,
  gm.grades_count,
  lg.subject as last_grade_subject,
  lg.score as last_grade_score,
  lg.max_score as last_grade_max,
  lg.when_at as last_grade_date,
  coalesce(na.subject, bs.next_assessment_subject) as next_assessment_subject,
  coalesce(na.when_at, bs.next_assessment_date) as next_assessment_date,
  bs.readiness,
  bs.risk_level,
  bs.ai_description,
  bs.last_contacted_at,
  bs.last_active_at,
  bs.updated_at
from public.black_students bs
left join public.profiles p on p.id = bs.user_id
left join public.profiles tp on tp.id = bs.tutor_id
left join lateral (
  select
    round(avg(case when bg.max_score is not null and bg.max_score <> 0 then bg.score / bg.max_score * 10 else bg.score end), 2) as current_avg,
    count(*)::bigint as grades_count
  from public.black_grades bg
  where bg.student_id = bs.id
) gm on true
left join lateral (
  select bg.subject, bg.score, bg.max_score, bg.when_at
  from public.black_grades bg
  where bg.student_id = bs.id
  order by bg.when_at desc nulls last, bg.created_at desc
  limit 1
) lg on true
left join lateral (
  select ba.subject, ba.when_at
  from public.black_assessments ba
  where ba.student_id = bs.id
    and ba.when_at >= current_date
  order by ba.when_at asc
  limit 1
) na on true;

-- Unified chronological feed for Black student operations.
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
  bs.id as student_id,
  bal.last_access_at as at,
  'access'::text as type,
  concat('Accessi giorno: ', bal.access_count::text) as details
from public.black_access_logs bal
join public.black_students bs on bs.user_id = bal.user_id;
