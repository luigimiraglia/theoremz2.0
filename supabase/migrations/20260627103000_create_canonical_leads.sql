create extension if not exists "pgcrypto";

create or replace function public.normalize_lead_phone(raw text)
returns text
language plpgsql
immutable
as $$
declare
  digits text;
begin
  if raw is null then
    return null;
  end if;
  if position('@' in raw) > 0 then
    return null;
  end if;

  digits := regexp_replace(raw, '\D+', '', 'g');
  if digits = '' then
    return null;
  end if;
  if left(digits, 2) = '00' then
    digits := substr(digits, 3);
  end if;
  if left(digits, 1) = '0' and length(digits) >= 10 then
    digits := regexp_replace(digits, '^0+', '');
  end if;
  if length(digits) = 10 and left(digits, 2) <> '39' then
    digits := '39' || digits;
  end if;

  return nullif(digits, '');
end;
$$;

create or replace function public.lead_contact_key(
  _email text,
  _phone text,
  _instagram text,
  _fallback text
)
returns text
language sql
immutable
as $$
  select coalesce(
    case when public.normalize_lead_phone(_phone) is not null then 'phone:' || public.normalize_lead_phone(_phone) end,
    case when nullif(trim(lower(_email)), '') is not null then 'email:' || trim(lower(_email)) end,
    case when nullif(trim(lower(_instagram)), '') is not null then 'ig:' || regexp_replace(trim(lower(_instagram)), '^@+', '') end,
    nullif(trim(_fallback), '')
  )
$$;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  contact_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  full_name text,
  email text,
  phone text,
  phone_normalized text,
  instagram_handle text,
  channel text not null default 'unknown'
    check (channel in ('instagram', 'whatsapp', 'phone', 'email', 'black', 'unknown')),
  source text not null default 'manual',
  funnel text not null default 'manual'
    check (funnel in ('manual', 'ilmetodo', 'quiz', 'quick_contact', 'whatsapp_prospect', 'black_churn', 'black_onboarding', 'other')),
  status text not null default 'active'
    check (status in ('active', 'completed', 'dropped')),
  response_status text not null default 'pending'
    check (response_status in ('pending', 'responded', 'no_response', 'paused')),
  temperature_score integer not null default 0
    check (temperature_score between 0 and 100),
  temperature_label text not null default 'cold'
    check (temperature_label in ('cold', 'warm', 'hot')),
  heat_reasons jsonb not null default '[]'::jsonb,
  current_step integer not null default 0,
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  completed_at timestamptz,
  responded_at timestamptz,
  no_response_at timestamptz,
  paused_at timestamptz,
  student_id uuid references public.students(id) on delete set null,
  page_url text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  legacy_refs jsonb not null default '{}'::jsonb
);

create index if not exists leads_temperature_idx
  on public.leads (status, response_status, temperature_score desc, next_follow_up_at asc);
create index if not exists leads_funnel_idx
  on public.leads (funnel, created_at desc);
create index if not exists leads_phone_normalized_idx
  on public.leads (phone_normalized)
  where phone_normalized is not null;
create index if not exists leads_email_idx
  on public.leads (lower(email))
  where email is not null;
create index if not exists leads_student_id_idx
  on public.leads (student_id)
  where student_id is not null;

create or replace function public.prepare_lead_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  score integer := 0;
  reasons text[] := array[]::text[];
begin
  new.updated_at := now();
  new.email := nullif(trim(lower(new.email)), '');
  new.instagram_handle := nullif(regexp_replace(trim(lower(coalesce(new.instagram_handle, ''))), '^@+', ''), '');
  new.phone_normalized := public.normalize_lead_phone(new.phone);
  new.contact_key := coalesce(
    nullif(trim(new.contact_key), ''),
    public.lead_contact_key(new.email, new.phone, new.instagram_handle, 'lead:' || new.id::text)
  );
  new.first_seen_at := coalesce(new.first_seen_at, new.created_at, now());
  new.last_seen_at := coalesce(new.last_seen_at, new.updated_at, new.created_at, now());

  score := case new.funnel
    when 'black_churn' then 62
    when 'whatsapp_prospect' then 55
    when 'ilmetodo' then 48
    when 'quiz' then 44
    when 'quick_contact' then 38
    when 'black_onboarding' then 35
    else 24
  end;
  reasons := array_append(reasons, 'funnel:' || new.funnel);

  if new.phone_normalized is not null then
    score := score + 14;
    reasons := array_append(reasons, 'phone');
  end if;
  if new.email is not null then
    score := score + 7;
    reasons := array_append(reasons, 'email');
  end if;
  if new.student_id is not null then
    score := score + 10;
    reasons := array_append(reasons, 'student_linked');
  end if;
  if new.response_status = 'responded' then
    score := score + 24;
    reasons := array_append(reasons, 'responded');
  elsif new.response_status = 'no_response' then
    score := score - 16;
    reasons := array_append(reasons, 'no_response');
  elsif new.response_status = 'paused' then
    score := score - 30;
    reasons := array_append(reasons, 'paused');
  end if;
  if new.status = 'dropped' then
    score := score - 35;
    reasons := array_append(reasons, 'dropped');
  elsif new.status = 'completed' then
    score := score - 10;
    reasons := array_append(reasons, 'completed');
  end if;
  if new.next_follow_up_at is not null and new.next_follow_up_at <= now() then
    score := score + 18;
    reasons := array_append(reasons, 'due_now');
  end if;
  if new.created_at >= now() - interval '48 hours' then
    score := score + 8;
    reasons := array_append(reasons, 'new');
  end if;
  if nullif(trim(coalesce(new.note, '')), '') is not null then
    score := score + 5;
    reasons := array_append(reasons, 'note');
  end if;

  new.temperature_score := greatest(0, least(100, score));
  new.temperature_label := case
    when new.temperature_score >= 75 then 'hot'
    when new.temperature_score >= 45 then 'warm'
    else 'cold'
  end;
  new.heat_reasons := to_jsonb(reasons);

  return new;
end;
$$;

drop trigger if exists trg_prepare_lead_row on public.leads;
create trigger trg_prepare_lead_row
before insert or update on public.leads
for each row execute function public.prepare_lead_row();

create or replace function public.upsert_canonical_lead(
  _contact_key text,
  _full_name text,
  _email text,
  _phone text,
  _instagram text,
  _channel text,
  _source text,
  _funnel text,
  _status text,
  _response_status text,
  _current_step integer,
  _next_follow_up_at timestamptz,
  _last_contacted_at timestamptz,
  _completed_at timestamptz,
  _responded_at timestamptz,
  _no_response_at timestamptz,
  _paused_at timestamptz,
  _student_id uuid,
  _page_url text,
  _note text,
  _created_at timestamptz,
  _updated_at timestamptz,
  _metadata jsonb,
  _legacy_refs jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.leads (
    contact_key,
    full_name,
    email,
    phone,
    instagram_handle,
    channel,
    source,
    funnel,
    status,
    response_status,
    current_step,
    next_follow_up_at,
    last_contacted_at,
    completed_at,
    responded_at,
    no_response_at,
    paused_at,
    student_id,
    page_url,
    note,
    created_at,
    first_seen_at,
    last_seen_at,
    metadata,
    legacy_refs
  )
  values (
    coalesce(_contact_key, public.lead_contact_key(_email, _phone, _instagram, null)),
    _full_name,
    _email,
    _phone,
    _instagram,
    coalesce(_channel, 'unknown'),
    coalesce(_source, 'manual'),
    coalesce(_funnel, 'manual'),
    coalesce(_status, 'active'),
    coalesce(_response_status, 'pending'),
    coalesce(_current_step, 0),
    _next_follow_up_at,
    _last_contacted_at,
    _completed_at,
    _responded_at,
    _no_response_at,
    _paused_at,
    _student_id,
    _page_url,
    _note,
    coalesce(_created_at, now()),
    coalesce(_created_at, now()),
    coalesce(_updated_at, _created_at, now()),
    coalesce(_metadata, '{}'::jsonb),
    coalesce(_legacy_refs, '{}'::jsonb)
  )
  on conflict (contact_key) do update set
    full_name = coalesce(leads.full_name, excluded.full_name),
    email = coalesce(leads.email, excluded.email),
    phone = coalesce(leads.phone, excluded.phone),
    instagram_handle = coalesce(leads.instagram_handle, excluded.instagram_handle),
    channel = case
      when leads.channel in ('unknown', 'phone', 'email') then excluded.channel
      else leads.channel
    end,
    source = case
      when leads.source = 'manual' and excluded.source <> 'manual' then excluded.source
      else leads.source
    end,
    funnel = case
      when excluded.funnel in ('black_churn', 'whatsapp_prospect', 'ilmetodo', 'quiz') then excluded.funnel
      when leads.funnel in ('manual', 'other') then excluded.funnel
      else leads.funnel
    end,
    status = case
      when leads.status = 'dropped' then leads.status
      when excluded.status = 'dropped' then excluded.status
      when leads.status = 'completed' and excluded.status = 'active' then excluded.status
      else coalesce(excluded.status, leads.status)
    end,
    response_status = case
      when leads.response_status = 'responded' then leads.response_status
      else coalesce(excluded.response_status, leads.response_status)
    end,
    current_step = greatest(coalesce(leads.current_step, 0), coalesce(excluded.current_step, 0)),
    next_follow_up_at = case
      when leads.next_follow_up_at is null then excluded.next_follow_up_at
      when excluded.next_follow_up_at is null then leads.next_follow_up_at
      else least(leads.next_follow_up_at, excluded.next_follow_up_at)
    end,
    last_contacted_at = greatest(coalesce(leads.last_contacted_at, '-infinity'::timestamptz), coalesce(excluded.last_contacted_at, '-infinity'::timestamptz)),
    completed_at = coalesce(leads.completed_at, excluded.completed_at),
    responded_at = coalesce(leads.responded_at, excluded.responded_at),
    no_response_at = coalesce(leads.no_response_at, excluded.no_response_at),
    paused_at = coalesce(leads.paused_at, excluded.paused_at),
    student_id = coalesce(leads.student_id, excluded.student_id),
    page_url = coalesce(leads.page_url, excluded.page_url),
    note = coalesce(leads.note, excluded.note),
    first_seen_at = least(coalesce(leads.first_seen_at, leads.created_at), coalesce(excluded.first_seen_at, excluded.created_at)),
    last_seen_at = greatest(coalesce(leads.last_seen_at, leads.updated_at), coalesce(excluded.last_seen_at, excluded.updated_at)),
    metadata = leads.metadata || excluded.metadata,
    legacy_refs = leads.legacy_refs || excluded.legacy_refs
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.sync_lead_from_manual_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.upsert_canonical_lead(
    public.lead_contact_key(null, new.whatsapp_phone, new.instagram_handle, 'manual:' || new.id::text),
    new.full_name,
    null,
    new.whatsapp_phone,
    new.instagram_handle,
    coalesce(new.channel, 'unknown'),
    'manual_leads',
    case
      when new.channel = 'black' then 'black_churn'
      when coalesce(new.note, '') ilike '%quiz:%' then 'quiz'
      else 'manual'
    end,
    new.status,
    new.response_status,
    new.current_step,
    new.next_follow_up_at,
    new.last_contacted_at,
    new.completed_at,
    new.responded_at,
    new.no_response_at,
    new.paused_at,
    null,
    null,
    new.note,
    new.created_at,
    new.updated_at,
    jsonb_build_object('manual_channel', new.channel),
    jsonb_build_object('manual_lead_id', new.id)
  );
  return new;
end;
$$;

create or replace function public.sync_lead_from_ilmetodo_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.upsert_canonical_lead(
    public.lead_contact_key(new.email, concat(coalesce(new.phone_prefix, ''), coalesce(new.phone, '')), null, 'ilmetodo:' || new.id::text),
    new.full_name,
    new.email,
    concat(coalesce(new.phone_prefix, ''), coalesce(new.phone, '')),
    null,
    case when new.phone is not null then 'whatsapp' else 'email' end,
    'ilmetodotheoremz_leads',
    'ilmetodo',
    'active',
    new.response_status,
    0,
    null,
    null,
    null,
    new.responded_at,
    new.no_response_at,
    new.paused_at,
    null,
    new.page_url,
    null,
    new.created_at,
    new.updated_at,
    jsonb_build_object('landing_source', new.source),
    jsonb_build_object('ilmetodotheoremz_lead_id', new.id)
  );
  return new;
end;
$$;

create or replace function public.sync_lead_from_black_followup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.upsert_canonical_lead(
    public.lead_contact_key(null, new.whatsapp_phone, null, 'black_followup:' || new.id::text),
    new.full_name,
    case when position('@' in coalesce(new.whatsapp_phone, '')) > 0 then new.whatsapp_phone else null end,
    new.whatsapp_phone,
    null,
    'black',
    'black_followups',
    'black_churn',
    new.status,
    'pending',
    0,
    new.next_follow_up_at,
    new.last_contacted_at,
    null,
    null,
    null,
    null,
    new.student_id,
    null,
    new.note,
    new.created_at,
    new.updated_at,
    '{}'::jsonb,
    jsonb_build_object('black_followup_id', new.id)
  );
  return new;
end;
$$;

create or replace function public.sync_lead_from_whatsapp_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type not in ('prospect', 'altro') then
    return new;
  end if;

  perform public.upsert_canonical_lead(
    public.lead_contact_key(null, coalesce(new.phone_e164, new.phone_tail), null, 'whatsapp:' || new.id::text),
    null,
    null,
    coalesce(new.phone_e164, new.phone_tail),
    null,
    'whatsapp',
    'black_whatsapp_conversations',
    'whatsapp_prospect',
    coalesce(case when new.status = 'closed' then 'completed' else 'active' end, 'active'),
    'pending',
    0,
    new.followup_due_at,
    new.last_message_at,
    null,
    null,
    null,
    null,
    new.student_id,
    null,
    new.last_message_preview,
    new.created_at,
    new.updated_at,
    jsonb_build_object('conversation_type', new.type, 'plan_label', new.plan_label),
    jsonb_build_object('whatsapp_conversation_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_sync_lead_from_manual_lead on public.manual_leads;
create trigger trg_sync_lead_from_manual_lead
after insert or update on public.manual_leads
for each row execute function public.sync_lead_from_manual_lead();

drop trigger if exists trg_sync_lead_from_ilmetodo_lead on public.ilmetodotheoremz_leads;
create trigger trg_sync_lead_from_ilmetodo_lead
after insert or update on public.ilmetodotheoremz_leads
for each row execute function public.sync_lead_from_ilmetodo_lead();

drop trigger if exists trg_sync_lead_from_black_followup on public.black_followups;
create trigger trg_sync_lead_from_black_followup
after insert or update on public.black_followups
for each row execute function public.sync_lead_from_black_followup();

drop trigger if exists trg_sync_lead_from_whatsapp_conversation on public.black_whatsapp_conversations;
create trigger trg_sync_lead_from_whatsapp_conversation
after insert or update on public.black_whatsapp_conversations
for each row execute function public.sync_lead_from_whatsapp_conversation();

insert into public.leads (
  contact_key, full_name, phone, instagram_handle, channel, source, funnel, status,
  response_status, current_step, next_follow_up_at, last_contacted_at, completed_at,
  responded_at, no_response_at, paused_at, note, created_at, first_seen_at, last_seen_at,
  metadata, legacy_refs
)
select
  public.lead_contact_key(null, whatsapp_phone, instagram_handle, 'manual:' || id::text),
  full_name, whatsapp_phone, instagram_handle, channel, 'manual_leads',
  case when channel = 'black' then 'black_churn' when coalesce(note, '') ilike '%quiz:%' then 'quiz' else 'manual' end,
  status, response_status, current_step, next_follow_up_at, last_contacted_at, completed_at,
  responded_at, no_response_at, paused_at, note, created_at, created_at, updated_at,
  jsonb_build_object('manual_channel', channel),
  jsonb_build_object('manual_lead_id', id)
from public.manual_leads
where public.lead_contact_key(null, whatsapp_phone, instagram_handle, 'manual:' || id::text) is not null
on conflict (contact_key) do nothing;

insert into public.leads (
  contact_key, full_name, email, phone, channel, source, funnel, status, response_status,
  responded_at, no_response_at, paused_at, page_url, created_at, first_seen_at, last_seen_at,
  metadata, legacy_refs
)
select distinct on (contact_key)
  contact_key,
  full_name, email, phone,
  channel,
  'ilmetodotheoremz_leads', 'ilmetodo', 'active', response_status,
  responded_at, no_response_at, paused_at, page_url, created_at, created_at, updated_at,
  metadata,
  legacy_refs
from (
  select
    public.lead_contact_key(email, concat(coalesce(phone_prefix, ''), coalesce(phone, '')), null, 'ilmetodo:' || id::text) as contact_key,
    full_name,
    email,
    concat(coalesce(phone_prefix, ''), coalesce(phone, '')) as phone,
    case when phone is not null then 'whatsapp' else 'email' end as channel,
    response_status,
    responded_at,
    no_response_at,
    paused_at,
    page_url,
    created_at,
    updated_at,
    jsonb_build_object('landing_source', source) as metadata,
    jsonb_build_object('ilmetodotheoremz_lead_id', id) as legacy_refs
  from public.ilmetodotheoremz_leads
) src
where contact_key is not null
order by contact_key, created_at desc
on conflict (contact_key) do update set
  funnel = 'ilmetodo',
  source = 'ilmetodotheoremz_leads',
  legacy_refs = leads.legacy_refs || excluded.legacy_refs,
  metadata = leads.metadata || excluded.metadata;

insert into public.leads (
  contact_key, full_name, email, phone, channel, source, funnel, status, response_status,
  next_follow_up_at, last_contacted_at, student_id, note, created_at, first_seen_at, last_seen_at,
  legacy_refs
)
select distinct on (contact_key)
  contact_key,
  full_name,
  email,
  whatsapp_phone,
  'black', 'black_followups', 'black_churn', status, 'pending',
  next_follow_up_at, last_contacted_at, student_id, note, created_at, created_at, updated_at,
  legacy_refs
from (
  select
    public.lead_contact_key(case when position('@' in coalesce(whatsapp_phone, '')) > 0 then whatsapp_phone else null end, whatsapp_phone, null, 'black_followup:' || id::text) as contact_key,
    full_name,
    case when position('@' in coalesce(whatsapp_phone, '')) > 0 then whatsapp_phone else null end as email,
    whatsapp_phone,
    status,
    next_follow_up_at,
    last_contacted_at,
    student_id,
    note,
    created_at,
    updated_at,
    jsonb_build_object('black_followup_id', id) as legacy_refs
  from public.black_followups
) src
where contact_key is not null
order by contact_key, updated_at desc
on conflict (contact_key) do update set
  funnel = 'black_churn',
  channel = 'black',
  student_id = coalesce(leads.student_id, excluded.student_id),
  legacy_refs = leads.legacy_refs || excluded.legacy_refs;

insert into public.leads (
  contact_key, phone, channel, source, funnel, status, response_status,
  next_follow_up_at, last_contacted_at, student_id, note, created_at, first_seen_at, last_seen_at,
  metadata, legacy_refs
)
select distinct on (contact_key)
  contact_key,
  phone,
  'whatsapp', 'black_whatsapp_conversations', 'whatsapp_prospect',
  status,
  'pending',
  followup_due_at, last_message_at, student_id, last_message_preview,
  created_at, created_at, updated_at,
  metadata,
  legacy_refs
from (
  select
    public.lead_contact_key(null, coalesce(phone_e164, phone_tail), null, 'whatsapp:' || id::text) as contact_key,
    coalesce(phone_e164, phone_tail) as phone,
    case when status = 'closed' then 'completed' else 'active' end as status,
    followup_due_at,
    last_message_at,
    student_id,
    last_message_preview,
    created_at,
    updated_at,
    jsonb_build_object('conversation_type', type, 'plan_label', plan_label) as metadata,
    jsonb_build_object('whatsapp_conversation_id', id) as legacy_refs
  from public.black_whatsapp_conversations
  where type in ('prospect', 'altro')
) src
where contact_key is not null
order by contact_key, updated_at desc
on conflict (contact_key) do update set
  funnel = case when leads.funnel = 'manual' then 'whatsapp_prospect' else leads.funnel end,
  legacy_refs = leads.legacy_refs || excluded.legacy_refs,
  metadata = leads.metadata || excluded.metadata;

create or replace view public.ranked_leads as
select
  l.*,
  row_number() over (
    order by
      l.temperature_score desc,
      l.next_follow_up_at asc nulls last,
      l.created_at desc
  ) as heat_rank
from public.leads l
where l.status = 'active';
