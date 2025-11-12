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
| `last_contacted_at` | `timestamptz` | Ultimo contatto registrato manualmente (bot/CRM). |
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
Subscribed: true

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

## Tabella `black_stripe_signups`

Inbox centralizzata per tutte le attivazioni Stripe, così il bot può mostrare i contatti anche prima che l'UID Firebase venga collegato.

| Campo | Tipo | Note |
| --- | --- | --- |
| `session_id` | `text` | Checkout Session; unique con `subscription_id`. |
| `subscription_id` | `text` | ID Stripe Subscription. |
| `customer_id` | `text` | ID Stripe Customer. |
| `plan_name`, `plan_label` | `text` | Snapshot del piano acquistato. |
| `amount_total` | `bigint` | Importo in centesimi; usa `amount_currency`. |
| `amount_currency`, `amount_display` | `text` | Valuta ISO e stringa pronta per UI. |
| `customer_name`, `customer_email`, `customer_phone` | `text` | Contatti raccolti nel checkout. |
| `persona`, `quiz_kind` | `text` | Metadati (es. `start-genitore`). |
| `whatsapp_link`, `whatsapp_message` | `text` | CTA pronta per l'onboarding. |
| `metadata` | `jsonb` | Copia raw dei metadata Stripe. |
| `status` | `text` | `new`, `synced`, `skipped`, `error`. |
| `student_user_id`, `student_id` | `text/uuid` | Popolati quando l'UID viene collegato a `black_students`. |
| `source` | `text` | Es. `checkout_session:cs_test_...`. |
| `event_created_at`, `created_at`, `updated_at`, `synced_at` | `timestamptz` | Timestamp Stripe + bookkeeping interno. |

### Flusso

1. Il webhook Stripe (`checkout.session.completed`) salva sia su Firestore (`stripe_subscriptions`) sia su `black_stripe_signups` con `status=new`.
2. Quando `syncBlackSubscriptionRecord` riesce ad allineare `profiles`/`black_students`, la riga viene aggiornata (`status=synced`, `student_user_id`, `student_id`, `synced_at`).
3. Il cron (`/api/cron/sync-black-subscriptions`) riprova la sincronizzazione e marca come `synced` anche gli storici.
4. Il bot (`/nuovi`) legge questa tabella per elencare le attivazioni Stripe ancora da collegare.

## Bot Telegram (`/api/telegram/hook`)

- Usa Supabase service role (`supabaseServer`) per interrogare `black_student_card`.
- Comandi `/s`, `/n`, `/v`, `/ass`, `/oggi`, `/nuovi`, `/sync` (`/syncstripe` alias).
- `/s <term>` ora supporta lookup smart: se `<term>` contiene `@` cerca per email (studenti o genitori) e, in fallback, via `profiles.email`. Altrimenti usa l’RPC `search_black_student` (full-text sul nome).
- Tutti i comandi loggano ed eventualmente rigenerano `brief_md` via RPC `refresh_black_brief`.
- `/nuovi` mostra prima le attivazioni Stripe da `black_stripe_signups` con `status != 'synced'` (ultimi 30 giorni) e poi gli studenti già sincronizzati in `black_students`.
- `/sync [limite]` (alias `/syncstripe`) rilancia `syncPendingStripeSignups` direttamente dal bot (default 25).

---

## Seeding & Sync (Stripe ↔ Firestore ↔ Supabase)

1. **Stripe webhook (`app/api/stripe/webhook/route.ts`)** salva ogni attivazione in Firestore (`stripe_subscriptions`) e su Supabase (`black_stripe_signups`). Aggancia qui gli hook per creare/aggiornare `black_students`:
   - Risali al Firebase UID (metadati Checkout o lookup email→UID).
   - Se l'UID non esiste ancora viene creato automaticamente in Firebase Admin partendo dall'email Stripe.
   - Popola i campi chiave (`subscription_status`, `stripe_customer_id`, contatti).
2. **Firestore**: conserva attività (login, consegne, chat) indicizzate per UID. Replica i contatori necessari (ultimo accesso, messaggi ultimi 30 giorni) in Supabase o in una tabella `user_metrics`.
3. **Cron giornaliero**:
   - chiama `GET /api/cron/sync-black-subscriptions?secret=XYZ` (Vercel Cron `0 0 * * *`) per riallineare Stripe → Supabase e rigenerare i brief; imposta `BLACK_CRON_SECRET`/`CRON_SECRET` per autorizzare la chiamata.
   - per sincronie manuali usa `POST /api/cron/manual-sync-stripe-signups?secret=XYZ&limit=25`, che prende gli `black_stripe_signups` non `synced` e rilancia lo stesso flusso (`syncBlackSubscriptionRecord`).
   - chiama `GET /api/telegram/digest?secret=XYZ` (Vercel Cron `0 18 * * *`): oltre a inviare il digest, questo endpoint decrementa automaticamente la `readiness` di 1 (clamp 0–100).
   - per riportare tutti a 100 (o forzare una discesa manuale) usa `GET /api/cron/readiness?action=reset&secret=XYZ` oppure `?action=decay`.
   - aggiorna readiness/risk/brief.
   - valida che la view `black_student_card` rifletta gli ultimi voti (`black_grades`) e verifiche (`black_assessments`).

Tenendo UID Firebase come chiave unica, il bot, Stripe, Firestore e Supabase rimangono coerenti e il recupero schede via email o nome è immediato.

---

## Tabella `black_contact_logs`

Log dedicato per tracciare i contatti tutor↔famiglia registrati dal bot o da eventuali tool operativi.

| Campo | Tipo | Note |
| --- | --- | --- |
| `id` | `uuid` | PK. |
| `student_id` | `uuid` | FK `black_students.id`. |
| `contacted_at` | `timestamptz` | Timestamp dichiarato dal tutor (default `now()` dal bot). |
| `body` | `text` | Nota/riassunto della conversazione. Facoltativa ma consigliata. |
| `source` | `text` | Es. `telegram_bot`, `crm_manual`. |
| `author_chat_id` | `text` | ID chat Telegram o identificativo equivalente. |
| `author_label` | `text` | Alias leggibile (es. nome tutor) per audit rapida. |
| `readiness_snapshot` | `int` | Readiness al momento del contatto (0–100) per storicizzare il contesto. |
| `created_at` | `timestamptz` | Default `now()`. |

Indici consigliati: `(student_id, contacted_at DESC)` per mostrare la cronologia di un singolo studente e `contacted_at` per report settimanali. Ogni volta che inserisci una riga aggiorna `black_students.last_contacted_at` con lo stesso timestamp per averlo disponibile anche sulle view operative (`black_student_card`, digest, ecc.).

> Bot Telegram: il comando `/checked cognome|email [nota]` aggiorna `last_contacted_at`, incrementa la readiness e inserisce una riga su `black_contact_logs`. Il comando `/nome email@example.com Nuovo Nome` aggiorna `profiles.full_name` e forza un refresh del brief. Le schede (`/s`) mostrano `last_contacted_at`, `last_active_at` e la readiness live.
