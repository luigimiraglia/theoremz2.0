-- Add optional WhatsApp group invite link to students
alter table if exists black_students
  add column if not exists whatsapp_group_link text null;
