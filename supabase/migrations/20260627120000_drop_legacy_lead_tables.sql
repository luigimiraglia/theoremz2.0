update public.leads
set source = case source
  when 'manual_leads' then 'legacy_manual'
  when 'ilmetodotheoremz_leads' then 'ilmetodotheoremz'
  when 'black_followups' then 'legacy_black_churn'
  else source
end
where source in ('manual_leads', 'ilmetodotheoremz_leads', 'black_followups');

do $$
begin
  if to_regclass('public.manual_leads') is not null then
    execute 'drop trigger if exists trg_sync_lead_from_manual_lead on public.manual_leads';
  end if;

  if to_regclass('public.ilmetodotheoremz_leads') is not null then
    execute 'drop trigger if exists trg_sync_lead_from_ilmetodo_lead on public.ilmetodotheoremz_leads';
  end if;

  if to_regclass('public.black_followups') is not null then
    execute 'drop trigger if exists trg_sync_lead_from_black_followup on public.black_followups';
  end if;
end $$;

drop function if exists public.sync_lead_from_manual_lead();
drop function if exists public.sync_lead_from_ilmetodo_lead();
drop function if exists public.sync_lead_from_black_followup();

drop table if exists public.manual_leads;
drop table if exists public.ilmetodotheoremz_leads;
drop table if exists public.black_followups;
