# Supabase Usage Audit

Audit basato su:

- riferimenti runtime a `.from(...)` e `.rpc(...)` in `app/`, `components/`, `lib/`;
- script in `scripts/` separati dai flussi utente;
- conteggio righe live via service role, senza leggere contenuti personali;
- dump schema live locale ignorato da Git.

## Sintesi

Il database oggi contiene cinque blocchi reali:

1. **Core studenti/account**: serve direttamente l'area account e le funzioni studente.
2. **Black/tutor/booking**: serve studenti Black, tutor, call e bot operativi.
3. **CRM/lead/marketing**: serve funnel, lead e campagne.
4. **Analytics**: traccia eventi e sessioni, ma ha parti duplicate/vecchie.
5. **Esperimenti/legacy**: chat Supabase, push token, difficolta/esercizi progress, alcune viste/tabelle editoriali.

La confusione principale non viene da una singola tabella, ma dal fatto che coesistono **Firebase UID (`user_id`)**, nuova identita canonica **`students.id`**, e vecchi moduli lasciati nel DB anche quando il sito non li usa piu.

## Cleanup Applicato

Applicato con migrazione `20260626172000_archive_and_drop_legacy_unused_objects.sql`.

Rimossi dal schema `public`:

- `push_tokens`
- `student_difficulties`
- `student_exercises_progress`
- `daily_stats`
- `black_whatsapp_inquiries`
- `black_events_feed`
- `call_slots_available`
- `content_editorial_plans`
- `conversations`
- `messages`
- RPC/funzioni legacy collegate: `open_or_get_conversation`, `bump_conversation_on_message`, `update_push_tokens_updated_at`, `content_editorial_plans_set_updated_at`, `content_editorial_plan_weekdays_set_updated_at`

Archiviati prima della rimozione:

- `archive.legacy_conversations_20260626`
- `archive.legacy_messages_20260626`
- `archive.legacy_black_whatsapp_inquiries_20260626`
- `archive.legacy_content_editorial_plans_20260626`

Verifica post-cleanup: OpenAPI pubblico Supabase mostra 40 oggetti; tutti gli oggetti sopra risultano rimossi dal `public`.

## Core Studenti: Tenere

Queste tabelle servono flussi visibili agli studenti o alla loro area account.

| Oggetto | Righe live | Uso reale |
| --- | ---: | --- |
| `students` | 3484 | Identita canonica nuova. Usata da `lib/students.ts`, area admin studenti, scheda tutor. |
| `profiles` | 3364 | Profilo account/Firebase, billing Stripe, ruoli. Usata in molti flussi. |
| `student_profiles` | 516 | Profilo Lite/account: classe, media, ciclo, interessi. |
| `student_assessments` | 180 | Verifiche/interrogazioni in account e scheda tutor. |
| `student_grades` | 439 | Voti in account. |
| `student_saved_lessons` | 49 | Salvataggio lezioni vero lato UI (`/api/me/saved-lessons`). |
| `student_lessons_progress` | 7 | Sync Lite/legacy saved/completed; non e il salvataggio primario UI. |
| `student_access_logs` | 3 | Log accessi Lite, poco popolato. |

Nota: `student_lessons_progress` e `student_saved_lessons` si sovrappongono. Il salvataggio UI usa `student_saved_lessons`; `student_lessons_progress` e usata da sync/backfill. Da consolidare, non cancellare subito.

## Black, Tutor e Booking: Tenere

Queste tabelle sono operative e usate da studenti Black, tutor, admin e bot.

| Oggetto | Righe live | Uso reale |
| --- | ---: | --- |
| `black_students` | 354 | Centro operativo Black. Molto usata. |
| `black_student_card` | 354 | View per digest/bot Telegram. |
| `black_student_brief` | 345 | Brief Markdown per bot/operativita Black. |
| `black_assessments` | 55 | Verifiche Black/account/tutor/bot. |
| `black_grades` | 117 | Voti Black/bot/sync. |
| `black_access_logs` | 6135 | Accessi Black da `/api/black/activity`. |
| `black_contact_logs` | 30 | Contatti tutor/famiglia da scheda tutor. |
| `black_stripe_signups` | 152 | Inbox attivazioni Stripe Black. |
| `tutors` | 4 | Tutor, booking, admin. |
| `tutor_assignments` | 15 | Relazione tutor-studente e billing ore. |
| `tutor_sessions` | 124 | Sessioni completate/ore tutor. |
| `call_bookings` | 200 | Prenotazioni call. Usata da studenti e admin. |
| `call_slots` | 1737 | Slot booking. |
| `call_types` | 3 | Tipi call. |
| `tutor_availability_blocks` | 172 | Disponibilita tutor. |
| `tutor_call_types` | 6 | Abilitazioni tutor-call type; poco referenziata nel codice ma parte dello schema booking. |

Nota: `book_call_slot` RPC esiste ma il codice oggi prenota spesso via query dirette su `call_slots`/`call_bookings`. La RPC e corretta come idea per atomicita, ma non e il path principale.

## WhatsApp/Telegram Ops: Tenere, ma non sono core studenti sito

| Oggetto | Righe live | Uso reale |
| --- | ---: | --- |
| `black_whatsapp_conversations` | 58 | Admin WhatsApp, webhook Stripe, WhatsApp cloud. |
| `black_whatsapp_messages` | 518 | Storico messaggi WhatsApp operativo. |
| `black_followups` | 332 | Follow-up Black e automazioni churn/onboarding. |
| `manual_leads` | 126 | Lead manuali/quiz/report/admin. |

`black_whatsapp_inquiries` ha 1 riga ma non risulta usata dal codice runtime. E documentata, ma il sito/bot attuale usa `black_whatsapp_conversations` e `black_whatsapp_messages`.

## Marketing, Lead e Newsletter: Tenere se servono al business

| Oggetto | Righe live | Uso reale |
| --- | ---: | --- |
| `newsletter_subscriptions` | 1056 | Newsletter settings, unsubscribe, import/campaign scripts. |
| `ilmetodotheoremz_leads` | 46 | Landing Il Metodo Theoremz e admin lead. |
| `ilmetodotheoremz_lead_streaks` | 46 | Streak contatti admin Il Metodo. |

Queste non sono funzioni studente, ma sono attive lato business.

## Analytics: Attivo, ma da semplificare

| Oggetto | Righe live | Uso reale |
| --- | ---: | --- |
| `events` | 420849 | Tracking eventi e dashboard analytics. |
| `sessions` | 19960 | Sessioni analytics. |
| `conversions` | 18191 | Conversioni/funnel. |
| `daily_stats` | 0 | Usata da `lib/analyticsDB.ts`, ma vuota. Probabile residuo/aggregato mai alimentato bene. |

`daily_stats` e il primo candidato da eliminare o sostituire con view/materialized view, perche e vuota e duplica aggregazioni calcolate da `events`/`sessions`/`conversions`.

## Content Production: Admin-only

| Oggetto | Righe live | Uso reale |
| --- | ---: | --- |
| `content_short_videos` | 43 | Admin content-production. |
| `content_short_video_formats` | 5 | Formati admin. |
| `content_editorial_plan` | 2 | Piano editoriale attualmente usato dal codice. |
| `content_editorial_settings` | 1 | Settings calendario editoriale. |
| `content_editorial_day_registry` | 11 | Registro giornaliero calendario editoriale. |
| `content_editorial_plans` | 1 | Non risulta usato dal codice; possibile esperimento/duplicato di `content_editorial_plan`. |

Qui c'e duplicazione: il codice usa `content_editorial_plan` singolare, mentre `content_editorial_plans` plurale esiste ma non e referenziata.

## Candidati Legacy / Rumore

Questa sezione descrive cosa e stato classificato come legacy prima della migrazione di cleanup.

| Oggetto | Righe live | Motivo |
| --- | ---: | --- |
| `push_tokens` | 0 | Nessun uso runtime trovato, tabella vuota. |
| `student_difficulties` | 0 | Nessun uso runtime; solo backfill/documentazione. |
| `student_exercises_progress` | 0 | Nessun uso runtime; solo backfill/documentazione. |
| `daily_stats` | 0 | Vuota; analytics usa dati raw e aggrega in JS. |
| `black_whatsapp_inquiries` | 1 | Documentata ma non usata dal codice attuale. |
| `black_events_feed` | 1671 | View non referenziata dal sito; puo essere utile futura ma oggi non serve runtime. |
| `call_slots_available` | 0 | View non usata: il codice interroga `call_slots` direttamente. |
| `content_editorial_plans` | 1 | Duplicato probabile, non usato dal codice. |
| `black_notes` | 0 | Inserita solo da RPC `add_note_and_refresh`; oggi vuota. Tenerla solo se vuoi note Black via bot. |
| `conversations` | 2 | Vecchia chat Supabase? Nessun UI attuale visibile la usa. |
| `messages` | 89 | Vecchia chat Supabase? Nessun UI attuale visibile la usa. |

## RPC / Funzioni DB

### Usate dal codice

| RPC | Uso |
| --- | --- |
| `search_black_student` | Bot Telegram lookup studenti. |
| `refresh_black_brief` | Bot Telegram, sync voti/verifiche Black, area account. |
| `add_note_and_refresh` | Bot Telegram note Black. |

### Usate da trigger o policy, quindi non eliminare senza migrazione

| Funzione | Uso |
| --- | --- |
| `handle_newsletter_unsubscribe` | Trigger newsletter. |
| `promote_to_black` | Trigger su `student_profiles.is_black`. |
| `ensure_black_profile` | Chiamata da `promote_to_black`. |
| `bump_conversation_on_message` | Trigger su vecchia tabella `messages`. |
| `is_email_verified`, `is_subscriber`, `is_tutor`, `jwt_sub` | Policy RLS/chat/profiles. |
| `*_set_updated_at`, `set_updated_at`, `tg_set_updated_at`, `set_timestamp_updated` | Trigger timestamp. |

### Sospette/legacy

| Funzione | Motivo |
| --- | --- |
| `open_or_get_conversation` | Legata a vecchia chat Supabase (`conversations`/`messages`). |
| `book_call_slot` | Buona idea ma non path principale oggi; il codice prenota con query dirette. |
| `content_editorial_plan_weekdays_set_updated_at` | Funzione presente ma la tabella weekdays non risulta nello schema live esposto. |

## Piano di cleanup consigliato

1. **Non toccare ancora il core studenti/Black/booking**.
2. **Marcare legacy nel codice/docs** per:
   - `push_tokens`
   - `student_difficulties`
   - `student_exercises_progress`
   - `daily_stats`
   - `black_whatsapp_inquiries`
   - `conversations`
   - `messages`
   - `content_editorial_plans`
3. **Aggiungere logging/alert per 14 giorni**: se un endpoint prova ancora a usare uno di questi oggetti, lo vediamo.
4. **Fare backup dati delle tabelle legacy non vuote**:
   - `messages`
   - `conversations`
   - `black_whatsapp_inquiries`
   - `content_editorial_plans`
5. **Poi migrare a `archive.*` oppure rinominare con prefisso `_legacy_`** invece di droppare subito.
6. **Consolidare identita studente**:
   - mantenere `students.id` come source of truth;
   - ridurre dipendenza da `user_id` nelle tabelle nuove;
   - lasciare `user_id` solo come ponte verso Firebase finche serve.

## Priorita pratica

La prima pulizia a basso rischio e:

1. smettere di considerare `daily_stats` parte dell'analytics attivo;
2. decidere se `student_saved_lessons` sostituisce definitivamente `student_lessons_progress`;
3. archiviare vecchia chat Supabase (`conversations`, `messages`, `open_or_get_conversation`) se non esiste piu una UI messaggi;
4. eliminare/archiviare `push_tokens`, `student_difficulties`, `student_exercises_progress` se restano vuote.
