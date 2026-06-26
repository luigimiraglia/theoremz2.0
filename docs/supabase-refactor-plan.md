# Supabase Student Refactor

## Stato finale

`students` e' la source of truth applicativa dello studente.

- `students.id` e' la chiave canonica da usare nelle relazioni.
- `students.auth_uid` collega lo studente a Firebase Auth.
- `students.black_active` indica se lo studente deve avere i vantaggi Black.
- Stripe resta la fonte autorevole dello stato abbonamento: webhook/sync aggiornano `students`.

## Cosa e' stato rimosso

- La vecchia tabella/view operativa `black_students`.
- La view `black_student_card`.
- La tabella archivio di rollback `black_students_legacy_archive_20260626`.
- Le colonne ponte `canonical_student_id` dalle tabelle operative.
- La colonna ponte `legacy_black_student_id` da `students`.
- Le funzioni ponte basate su id legacy.

## Cosa resta

Restano le tabelle dati utili del prodotto Black, ma puntano a `students.id` tramite `student_id`:

- `black_assessments`
- `black_grades`
- `black_notes`
- `black_contact_logs`
- `black_student_brief`
- `black_stripe_signups`
- `black_whatsapp_conversations`
- `black_whatsapp_messages`
- `black_followups`
- `tutor_assignments`
- `tutor_sessions`

## Regola pratica

Per capire uno studente:

1. Parti da `students.id`.
2. Usa `students.auth_uid` solo quando serve parlare con Firebase/profiles.
3. Usa `students.black_active` per abilitare o disabilitare le feature Black.
4. Non creare nuove tabelle parallele per Black: aggiungi campi o relazioni a `students` e alle tabelle evento/storico.
