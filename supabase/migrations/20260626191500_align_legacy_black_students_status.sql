update public.black_students bs
set
  status = coalesce(nullif(s.subscription_status, ''), 'inactive'),
  updated_at = now()
from public.students s
where bs.student_id = s.id
  and s.black_active is false
  and lower(coalesce(bs.status, '')) in ('active', 'trialing', 'past_due')
  and lower(coalesce(s.subscription_status, '')) not in ('active', 'trialing', 'past_due');
