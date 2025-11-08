# Theoremz Black – Database & Bot Reference

Questa nota riassume lo schema dati usato dall’ecosistema Black (Supabase + Firebase) e i flussi principali per bot/cron. Mantienila allineata quando evolviamo le tabelle o le regole di calcolo.

---

## Tabella `black_students`

| Campo | Tipo | Note |
| --- | --- | --- |
| `id` | `uuid` | PK generata server-side. |
| `user_id` | `text` | **Obbligatorio**: Firebase UID dello studente (uguale a `profiles.id`). |
| `full_name` | `text` | **Obbligatorio**: snapshot per ricerche rapide. |
| `school_cycle` | `text` | **Obbligatorio**: es. `3°Liceo`, `5°Scientifico`. Standardizza via dizionario interno. |
| `class_section` | `text` | Es. `2A`, `5B`. |
| `track` | `text` | `matematica`, `fisica`, `entrambi` (default `entrambi`). |
| `start_date` | `date` | Default oggi. |
| `goal` | `text` | Obiettivo dichiarato. |
| `difficulty_focus` | `text` | Area di difficoltà. |
| `parent_name`, `parent_phone`, `parent_email` | `text` | Contatti famiglia. |
| `student_phone`, `student_email` | `text` | Contatti studente. |
| `tutor_id` | `text` | Firebase UID del tutor (match con `profiles.id`). |
| `subscription_status` | `text` | `active`, `trial`, `canceled`… derivato da Stripe. |
| `stripe_customer_id` | `text` | Facoltativo. |
| `initial_avg`, `current_avg` | `numeric` | Scala 0–10 (coerente ovunque). |
| `grades_count` | `int` | Cache numero voti. |
| `last_grade_subject`, `last_grade_score`, `last_grade_max`, `last_grade_date` | `numeric/date` | Snapshot ultimo voto. |
| `next_assessment_subject`, `next_assessment_date` | `text/date` | Prossima verifica nota. |
| `readiness` | `int` | 0–100. |
| `risk_level` | `text` | `green`, `yellow`, `red`. |
| `ai_description` | `text` | Spiegazione AI opzionale. |
| `last_active_at` | `timestamptz` | Ultima attività (login/chat/etc). |
| `created_at`, `updated_at` | `timestamptz` | Default now, `updated_at` via trigger. |

**Indici da mantenere**: `user_id`, `tutor_id`, `parent_email`, `student_email`, `next_assessment_date`, `(risk_level, readiness)`.

### Identità e matching

- Fonte unica per l’UID: Firebase Auth. Ogni sistema (Supabase `profiles`, Firestore `users`, tabelle Black) usa lo stesso UID testo.
- `profiles.id` = Firebase UID. Sincronizza lì nome completo ed email per tutte le ricerche.
- Stripe: conserva lo stesso UID nei metadata oppure in `black_students.stripe_customer_id`.
- Firestore: se salvi meta extra, usa l’UID come ID documento.

### `brief_md`

Markdown renderizzato dal bot/web che deve includere:

```
NOME COGNOME — Theoremz Black

Classe/Anno: 3°Liceo B   Track: matematica
Tutor: Nome Tutor (email_tutor)

Contatti
Genitore: Nome Cognome — Tel — Email
Studente: Email — Tel

Obiettivo
...

Focus / Difficoltà
...

Stato
Readiness: 72/100
Rischio: yellow
Prossima verifica: Matematica — 12/11/2025
Media iniziale: 6.2 — Media attuale: 7.1 (5 voti)
Ultimo voto: Fisica 7.5/10 (2025-11-02)

Descrizione (AI)
...

Aggiornato: 07/11/2025
```

Aggiorna la cache ogni volta che inserisci voti/verifiche/note o via job giornaliero.

---

## View `black_student_card`

Espone i campi necessari al digest e ai bot:

- Identità: `student_id`, `user_id`, `student_name`, `school_cycle`, `class_section`, `track`, `student_email`, `parent_email`, `tutor_id`, `tutor_name`, `tutor_email`.
- Stato abbonamento: `subscription_status`, `stripe_customer_id`.
- Metriche scolastiche: `initial_avg`, `current_avg`, `grades_count`, `last_grade_*`.
- Verifiche: `next_assessment_subject`, `next_assessment_date`.
- Indici sintetici: `readiness` (0–100) e `risk_level`.
- Attività: `last_active_at`, `updated_at`.

È una view read-only (no INSERT/DELETE). Aggiornala via trigger/procedure sulle tabelle sorgenti (`black_students`, `black_grades`, `black_assessments`, ecc.).

### Calcolo metriche

- `current_avg`, `grades_count`: media e conteggio da `black_grades`. Normalizza i punteggi su scala 0–10 (`score / max_score * 10` se i massimi variano).
- `next_assessment_*`: prima verifica futura in `black_assessments` (ordinata per data).
- `readiness` (consiglio operativo):
  - 35% engagement: attività negli ultimi 30 giorni (login/chat/consegne). Replica gli eventi Firestore in Supabase per query veloci.
  - 35% andamento: delta vs `initial_avg` oppure `current_avg/10*100`.
  - 15% recency: bonus se ci sono voti o note recenti.
  - 15% subscription: `active=100`, `trial=70`, `canceled=20`.
  - Clamp 0–100 e arrotonda a intero.
- `risk_level`:
  - `red`: `readiness < 40` **oppure** verifica ≤7 giorni e `current_avg < 6`.
  - `yellow`: `40 ≤ readiness < 60` **oppure** `6 ≤ current_avg < 7.5`.
  - `green`: casi restanti.

Esegui un job giornaliero per aggiornare readiness/risk + `brief_md`, e lancialo anche quando inserisci voti/verifiche.

---

## Bot Telegram (`/api/telegram/hook`)

- Usa Supabase service role (`supabaseServer`) per interrogare `black_student_card`.
- Comandi `/s`, `/n`, `/v`, `/ass`, `/oggi`.
- `/s <term>` ora supporta lookup smart: se `<term>` contiene `@` cerca per email (studenti o genitori) e, in fallback, via `profiles.email`. Altrimenti usa l’RPC `search_black_student` (full-text sul nome).
- Tutti i comandi loggano ed eventualmente rigenerano `brief_md` via RPC `refresh_black_brief`.

---

## Seeding & Sync (Stripe ↔ Firestore ↔ Supabase)

1. **Stripe webhook (`app/api/stripe/webhook/route.ts`)** salva ogni attivazione in Firestore (`stripe_subscriptions`). Aggancia qui gli hook per creare/aggiornare `black_students`:
   - Risali al Firebase UID (metadati Checkout o lookup email→UID).
   - Popola i campi chiave (`subscription_status`, `stripe_customer_id`, contatti).
2. **Firestore**: conserva attività (login, consegne, chat) indicizzate per UID. Replica i contatori necessari (ultimo accesso, messaggi ultimi 30 giorni) in Supabase o in una tabella `user_metrics`.
3. **Cron giornaliero**:
   - aggiorna readiness/risk/brief.
   - valida che la view `black_student_card` rifletta gli ultimi voti (`black_grades`) e verifiche (`black_assessments`).

Tenendo UID Firebase come chiave unica, il bot, Stripe, Firestore e Supabase rimangono coerenti e il recupero schede via email o nome è immediato.

