# Students Source Of Truth

Questa nota descrive il modello attuale: `students` e' l'entita' applicativa centrale dello studente.

## Regola base

- `Firebase Auth` serve solo per l'autenticazione.
- `students.id` è la chiave applicativa dello studente.
- `students.auth_uid` collega opzionalmente uno studente a un account Firebase.
- Ogni flusso nuovo che crea uno studente deve prima garantire una riga in `students`.
- Non ogni `students` deve avere account.
- Non ogni `students` deve essere Black.
- Se uno studente e' Black, lo indica `students.black_active` insieme ai campi subscription/Stripe.

## Tabelle

### `students`

Anagrafica unica dello studente:

- `id uuid`
- `auth_uid text unique null`
- `full_name`
- `email`
- `phone`
- `phone_normalized`
- `source`
- `subscription_tier`
- `subscription_status`
- `black_active`
- campi Stripe principali
- dati operativi Black utili, come contatti, classe, obiettivi, readiness, tutor e ore

### `student_*`

Tabelle account/prodotto.

Continuano a conservare `user_id` per compatibilita' con Firebase, ma il riferimento applicativo e' `student_id -> students.id`.

Obiettivo:

- `student_profiles.student_id`
- `student_assessments.student_id`
- `student_grades.student_id`
- `student_lessons_progress.student_id`
- `student_exercises_progress.student_id`
- `student_difficulties.student_id`
- `student_access_logs.student_id`
- `student_saved_lessons.student_id`

### Tabelle Black operative

Non esiste piu' una tabella studenti Black separata. Le tabelle operative Black salvano eventi/storico e puntano direttamente a `students.id`:

- `black_assessments.student_id`
- `black_grades.student_id`
- `black_notes.student_id`
- `black_contact_logs.student_id`
- `black_student_brief.student_id`
- `black_stripe_signups.student_id`
- `black_whatsapp_conversations.student_id`
- `black_whatsapp_messages.student_id`
- `black_followups.student_id`
- `tutor_assignments.student_id`
- `tutor_sessions.student_id`

## Strategia di migrazione

Completata:

1. Creato `students` come entita' unica.
2. Backfill dai dati esistenti.
3. Spostate le tabelle operative a `student_id -> students.id`.
4. Rimosse tabella/view studenti Black separate e colonne ponte.
5. Aggiornate le route applicative a leggere `students`.

## Flussi già collegati

Con questa fase iniziale i seguenti flussi garantiscono o aggiornano `students`:

- signup/login account tramite `syncLiteProfilePatch`
- sync Stripe/Black tramite `syncBlackSubscriptionRecord`
- attività runtime Black tramite `/api/black/activity`
- creazione/assegnazione studente Black da admin tramite `/api/admin/tutor-assignments`

## Script di backfill

Lo script resta utile solo per collegare vecchie righe `student_*` a `students.id`:

```bash
node scripts/backfill-students-source-of-truth.mjs
```
