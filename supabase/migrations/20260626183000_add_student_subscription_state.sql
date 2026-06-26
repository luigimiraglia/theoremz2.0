alter table public.students
  add column if not exists subscription_tier text not null default 'free',
  add column if not exists subscription_status text,
  add column if not exists black_active boolean not null default false,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_current_period_end timestamptz,
  add column if not exists stripe_cancel_at_period_end boolean not null default false,
  add column if not exists stripe_canceled_at timestamptz,
  add column if not exists black_since date,
  add column if not exists black_last_active_at timestamptz,
  add column if not exists black_last_contacted_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'students_subscription_tier_check'
      and conrelid = 'public.students'::regclass
  ) then
    alter table public.students
      add constraint students_subscription_tier_check
      check (subscription_tier in ('free', 'black', 'mentor'));
  end if;
end $$;

create index if not exists students_auth_uid_idx
  on public.students (auth_uid);

create index if not exists students_black_active_idx
  on public.students (black_active)
  where black_active is true;

create index if not exists students_stripe_customer_id_idx
  on public.students (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists students_stripe_subscription_id_idx
  on public.students (stripe_subscription_id)
  where stripe_subscription_id is not null;

with profile_state as (
  select
    p.id as auth_uid,
    p.subscription_tier,
    lower(nullif(trim(p.stripe_subscription_status), '')) as stripe_subscription_status,
    p.stripe_customer_id,
    p.stripe_price_id,
    p.stripe_current_period_end,
    p.stripe_cancel_at_period_end,
    p.stripe_canceled_at,
    (
      p.subscription_tier = 'black'
      and lower(coalesce(p.stripe_subscription_status, '')) in ('active', 'trialing', 'past_due', 'unpaid')
    ) as black_active
  from public.profiles p
)
update public.students s
set
  subscription_tier = coalesce(ps.subscription_tier, s.subscription_tier, 'free'),
  subscription_status = coalesce(ps.stripe_subscription_status, s.subscription_status),
  black_active = ps.black_active,
  stripe_customer_id = coalesce(ps.stripe_customer_id, s.stripe_customer_id),
  stripe_price_id = coalesce(ps.stripe_price_id, s.stripe_price_id),
  stripe_current_period_end = coalesce(ps.stripe_current_period_end, s.stripe_current_period_end),
  stripe_cancel_at_period_end = coalesce(ps.stripe_cancel_at_period_end, s.stripe_cancel_at_period_end, false),
  stripe_canceled_at = coalesce(ps.stripe_canceled_at, s.stripe_canceled_at),
  updated_at = now()
from profile_state ps
where s.auth_uid = ps.auth_uid;

with black_state as (
  select
    bs.student_id,
    lower(nullif(trim(bs.status), '')) as status,
    bs.start_date,
    bs.last_active_at,
    bs.last_contacted_at
  from public.black_students bs
  where bs.student_id is not null
)
update public.students s
set
  subscription_tier = case
    when s.subscription_tier = 'free'
      and bs.status in ('active', 'trialing', 'past_due', 'unpaid')
      then 'black'
    else s.subscription_tier
  end,
  subscription_status = coalesce(s.subscription_status, bs.status),
  black_active = case
    when s.black_active then true
    when s.subscription_status is null
      and bs.status in ('active', 'trialing', 'past_due', 'unpaid')
      then true
    else s.black_active
  end,
  black_since = coalesce(s.black_since, bs.start_date),
  black_last_active_at = coalesce(bs.last_active_at, s.black_last_active_at),
  black_last_contacted_at = coalesce(bs.last_contacted_at, s.black_last_contacted_at),
  updated_at = now()
from black_state bs
where s.id = bs.student_id;

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
  bs.id as black_student_id,
  bs.status as black_student_status
from public.students s
left join public.profiles p
  on p.id = s.auth_uid
left join public.black_students bs
  on bs.student_id = s.id;
