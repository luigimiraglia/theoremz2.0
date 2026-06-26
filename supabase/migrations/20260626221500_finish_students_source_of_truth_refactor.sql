drop view if exists public.black_student_card;
drop view if exists public.black_students cascade;
drop table if exists public.black_students cascade;

create or replace function public.refresh_black_brief(_student uuid, _ai_desc text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_brief text;
begin
  if _student is null then
    return;
  end if;

  select concat_ws(E'\n',
    '# Scheda Black',
    'Nome: ' || coalesce(s.preferred_name, s.full_name, s.student_email, s.parent_email, 'Studente'),
    'Classe: ' || coalesce(s.year_class, 'n/d'),
    'Track: ' || coalesce(s.track, 'n/d'),
    'Obiettivo: ' || coalesce(s.goal, 'n/d'),
    'Focus: ' || coalesce(s.difficulty_focus, 'n/d'),
    'Readiness: ' || coalesce(s.readiness::text, 'n/d'),
    'Rischio: ' || coalesce(s.risk_level, 'n/d'),
    'Prossima verifica: ' || coalesce(s.next_assessment_subject, 'n/d') || ' ' || coalesce(s.next_assessment_date::text, ''),
    'AI: ' || coalesce(_ai_desc, s.ai_description, 'n/d')
  )
  into v_brief
  from public.students s
  where s.id = _student;

  if v_brief is null then
    return;
  end if;

  insert into public.black_student_brief (student_id, brief_md, updated_at, version)
  values (_student, v_brief, now(), 1)
  on conflict (student_id) do update set
    brief_md = excluded.brief_md,
    updated_at = excluded.updated_at,
    version = public.black_student_brief.version + 1;
end;
$$;

alter table if exists public.students drop constraint if exists black_students_user_id_fkey;
alter table if exists public.students drop constraint if exists black_students_tutor_id_fkey;
alter table if exists public.students drop constraint if exists black_students_videolesson_tutor_id_fkey;

alter table if exists public.black_assessments drop column if exists canonical_student_id;
alter table if exists public.black_grades drop column if exists canonical_student_id;
alter table if exists public.black_notes drop column if exists canonical_student_id;
alter table if exists public.black_contact_logs drop column if exists canonical_student_id;
alter table if exists public.black_student_brief drop column if exists canonical_student_id;
alter table if exists public.black_stripe_signups drop column if exists canonical_student_id;
alter table if exists public.black_whatsapp_conversations drop column if exists canonical_student_id;
alter table if exists public.black_whatsapp_messages drop column if exists canonical_student_id;
alter table if exists public.black_followups drop column if exists canonical_student_id;
alter table if exists public.tutor_assignments drop column if exists canonical_student_id;
alter table if exists public.tutor_sessions drop column if exists canonical_student_id;

alter table if exists public.students drop column if exists legacy_black_student_id;
alter table if exists public.students drop column if exists student_id;

drop table if exists public.black_students_legacy_archive_20260626;
drop function if exists public.resolve_canonical_student_id(uuid);
drop function if exists public.uuid_or_null(text);
