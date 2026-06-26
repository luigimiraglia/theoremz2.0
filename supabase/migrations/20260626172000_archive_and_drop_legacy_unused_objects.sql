-- Remove unused legacy objects from the public schema.
--
-- Non-empty tables are copied to archive.* before removal so the public schema
-- is cleaned up without losing historical data.

create schema if not exists archive;

create table if not exists archive.legacy_conversations_20260626 as
select * from public.conversations;

create table if not exists archive.legacy_messages_20260626 as
select * from public.messages;

create table if not exists archive.legacy_black_whatsapp_inquiries_20260626 as
select * from public.black_whatsapp_inquiries;

create table if not exists archive.legacy_content_editorial_plans_20260626 as
select * from public.content_editorial_plans;

-- Unused views.
drop view if exists public.black_events_feed;
drop view if exists public.call_slots_available;

-- Old Supabase chat module. Current WhatsApp/admin chat uses
-- black_whatsapp_conversations and black_whatsapp_messages instead.
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;
drop function if exists public.open_or_get_conversation();
drop function if exists public.open_or_get_conversation(text);
drop function if exists public.bump_conversation_on_message();

-- Empty/unused student progress experiments.
drop table if exists public.student_exercises_progress cascade;
drop table if exists public.student_difficulties cascade;

-- Empty/unused push token table.
drop table if exists public.push_tokens cascade;
drop function if exists public.update_push_tokens_updated_at();

-- Unused analytics aggregate. Runtime analytics reads raw events, sessions and
-- conversions instead.
drop table if exists public.daily_stats cascade;
drop sequence if exists public.daily_stats_id_seq;

-- Unused WhatsApp inquiry staging table. Runtime uses black_whatsapp_conversations.
drop table if exists public.black_whatsapp_inquiries cascade;

-- Duplicate editorial plan table. Runtime uses content_editorial_plan.
drop table if exists public.content_editorial_plans cascade;
drop function if exists public.content_editorial_plans_set_updated_at();
drop function if exists public.content_editorial_plan_weekdays_set_updated_at();
