do $$
declare
  r record;
  v_student_id uuid;
  v_email text;
  v_phone text;
  v_phone_normalized text;
begin
  for r in
    select *
    from public.black_students
    where student_id is null
  loop
    v_student_id := null;
    v_email := lower(nullif(trim(coalesce(r.student_email, r.parent_email)), ''));
    v_phone := nullif(trim(coalesce(r.student_phone, r.parent_phone)), '');
    v_phone_normalized := nullif(regexp_replace(coalesce(v_phone, ''), '\D', '', 'g'), '');

    select s.id
      into v_student_id
    from public.students s
    where (r.user_id is not null and s.auth_uid = r.user_id)
       or (v_email is not null and s.email = v_email)
       or (v_phone_normalized is not null and s.phone_normalized = v_phone_normalized)
    order by
      case when r.user_id is not null and s.auth_uid = r.user_id then 0 else 1 end,
      s.created_at nulls last
    limit 1;

    if v_student_id is null then
      insert into public.students (
        auth_uid,
        full_name,
        email,
        phone,
        phone_normalized,
        source,
        updated_at
      )
      values (
        r.user_id,
        coalesce(r.preferred_name, r.student_name, r.parent_name, v_email, 'Studente'),
        v_email,
        v_phone,
        v_phone_normalized,
        'black_student_canonical_backfill',
        now()
      )
      returning id into v_student_id;
    end if;

    update public.black_students
    set student_id = v_student_id,
        updated_at = now()
    where id = r.id;
  end loop;
end $$;

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
