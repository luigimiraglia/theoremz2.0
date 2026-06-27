create or replace function public.prepare_lead_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  score integer := 0;
  reasons text[] := array[]::text[];
  lead_age_days integer := 0;
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

  lead_age_days := greatest(0, floor(extract(epoch from (now() - coalesce(new.first_seen_at, new.created_at, now()))) / 86400)::integer);

  score := case new.funnel
    when 'ilmetodo' then 62
    when 'whatsapp_prospect' then 46
    when 'quiz' then 36
    when 'quick_contact' then 30
    when 'black_onboarding' then 28
    when 'manual' then 22
    when 'black_churn' then 12
    else 18
  end;
  reasons := array_append(reasons, 'funnel:' || new.funnel);

  if new.source in ('ilmetodotheoremz', 'ilmetodo', 'landing_ilmetodo') then
    score := score + 8;
    reasons := array_append(reasons, 'source:high_intent');
  elsif new.source ilike 'landing%' then
    score := score + 5;
    reasons := array_append(reasons, 'source:landing');
  end if;

  if lead_age_days = 0 then
    score := score + 24;
    reasons := array_append(reasons, 'age:today');
  elsif lead_age_days <= 2 then
    score := score + 16;
    reasons := array_append(reasons, 'age:2d');
  elsif lead_age_days <= 7 then
    score := score + 8;
    reasons := array_append(reasons, 'age:7d');
  elsif lead_age_days <= 14 then
    reasons := array_append(reasons, 'age:14d');
  elsif lead_age_days <= 30 then
    score := score - 18;
    reasons := array_append(reasons, 'age:30d');
  elsif lead_age_days <= 45 then
    score := score - 30;
    reasons := array_append(reasons, 'age:45d');
  elsif lead_age_days <= 60 then
    score := score - 42;
    reasons := array_append(reasons, 'age:60d');
  else
    score := score - 55;
    reasons := array_append(reasons, 'age:old');
  end if;

  if new.phone_normalized is not null then
    score := score + 20;
    reasons := array_append(reasons, 'phone');
  end if;
  if new.email is not null then
    score := score + 5;
    reasons := array_append(reasons, 'email');
  end if;
  if new.student_id is not null then
    score := score + 6;
    reasons := array_append(reasons, 'student_linked');
  end if;

  if new.response_status = 'responded' then
    score := score + 18;
    reasons := array_append(reasons, 'responded');
  elsif new.response_status = 'no_response' then
    score := score - 22;
    reasons := array_append(reasons, 'no_response');
  elsif new.response_status = 'paused' then
    score := score - 45;
    reasons := array_append(reasons, 'paused');
  end if;

  if new.status = 'dropped' then
    score := score - 60;
    reasons := array_append(reasons, 'dropped');
  elsif new.status = 'completed' then
    score := score - 30;
    reasons := array_append(reasons, 'completed');
  end if;

  if new.next_follow_up_at is not null and new.next_follow_up_at <= now() then
    score := score + 10;
    reasons := array_append(reasons, 'due_now');
  end if;
  if nullif(trim(coalesce(new.note, '')), '') is not null then
    score := score + 3;
    reasons := array_append(reasons, 'note');
  end if;

  if new.funnel = 'black_churn' then
    score := least(score, 42);
    reasons := array_append(reasons, 'cap:black_churn');
  end if;
  if lead_age_days > 45 then
    score := least(score, 44);
    reasons := array_append(reasons, 'cap:stale');
  elsif lead_age_days > 30 then
    score := least(score, 60);
    reasons := array_append(reasons, 'cap:aging');
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

update public.leads
set note = note
where true;
