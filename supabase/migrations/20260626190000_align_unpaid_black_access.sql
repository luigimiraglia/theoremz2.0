update public.students
set
  black_active = false,
  updated_at = now()
where lower(coalesce(subscription_status, '')) = 'unpaid'
  and black_active is true;
