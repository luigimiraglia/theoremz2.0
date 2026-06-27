update public.leads
set next_follow_up_at = now()
where funnel = 'black_churn'
  and status = 'active'
  and next_follow_up_at is null;
