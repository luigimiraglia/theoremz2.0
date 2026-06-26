# Students Source Of Truth

Questa nota introduce il modello target in cui `students` diventa l'entità applicativa centrale dello studente.

## Regola base

- `Firebase Auth` serve solo per l'autenticazione.
- `students.id` è la chiave applicativa dello studente.
- `students.auth_uid` collega opzionalmente uno studente a un account Firebase.
- Ogni flusso nuovo che crea uno studente deve prima garantire una riga in `students`.
- Non ogni `students` deve avere account.
- Non ogni `students` deve essere Black.

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

### `student_*`

Tabelle account/prodotto.

Continuano a conservare `user_id` per compatibilità, ma iniziano ad avere anche `student_id`.

Obiettivo:

- `student_profiles.student_id`
- `student_assessments.student_id`
- `student_grades.student_id`
- `student_lessons_progress.student_id`
- `student_exercises_progress.student_id`
- `student_difficulties.student_id`
- `student_access_logs.student_id`
- `student_saved_lessons.student_id`

### `black_students`

Resta la tabella CRM/operativa del mondo Black, ma viene collegata a `students` tramite:

- `black_students.student_id`

`black_students.user_id` resta temporaneamente per compatibilità con il modello attuale e con i flussi legacy.

## Strategia di migrazione

1. Creare `students` e i nuovi campi `student_id`.
2. Fare backfill dai dati esistenti.
3. Fare dual-write: ogni creazione/auth/Black aggiorna anche `students`.
4. Spostare gradualmente letture e relazioni applicative su `student_id`.
5. Solo in una fase successiva rimuovere la dipendenza semantica da `user_id`.

## Flussi già collegati

Con questa fase iniziale i seguenti flussi garantiscono o aggiornano `students`:

- signup/login account tramite `syncLiteProfilePatch`
- sync Stripe → Black tramite `syncBlackSubscriptionRecord`
- attività runtime Black tramite `/api/black/activity`
- creazione/assegnazione studente Black da admin tramite `/api/admin/tutor-assignments`

## Backfill

Per popolare i dati esistenti:

```bash
node scripts/backfill-students-source-of-truth.mjs
```

Prima esegui la migrazione SQL:

```sql
-- supabase/students.sql
```
