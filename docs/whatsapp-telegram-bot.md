# WhatsApp & Telegram Bot – Flussi e Stati

Riepilogo operativo dei bot WA/Telegram, con comandi, stati conversazione e behavior di sales/black.

## Tabelle chiave
- `black_whatsapp_messages`: log cronologia WA (`role`: user/assistant, `phone_tail`, `student_id` opzionale).
- `black_whatsapp_conversations`: stato per numero (chiave `phone_tail`):
  - `status`: `waiting_tutor` (default, inoltro), `tutor`, `bot`.
  - `type`: `black`, `prospect`, `genitore`, `insegnante`, `altro`.
  - `student_id`: collegamento a `black_students` se noto.
  - `bot`: nome bot assegnato (libero).
  - `followup_due_at` / `followup_sent_at`: recall sales.
  - `last_message_at`, `last_message_preview`.
- Cron unico (`/api/cron/master`) schedulato daily su Vercel (`0 18 * * *`):
  - Chiama follow-up WA (`/api/whatsapp-cloud/followup?secret=...`).
  - Digest Telegram (`/api/telegram/digest`).
  - Sync Stripe (`/api/cron/sync-black-subscriptions`).

## Comandi Telegram (operatori)
- `/waclist` → ultime 7 conversazioni WA (status/type, last message, follow-up).
- `/wainfo tel|email|nome` → dettaglio conversazione + ultimi messaggi.
- `/wa tel|email|nome messaggio` → invia WA, imposta stato `tutor`.
- `/wastatus tel|email|nome bot|waiting|tutor` → cambia stato.
- `/watype tel|email|nome black|prospect|genitore|insegnante|altro` → cambia tipo.
- `/wabot tel|email|nome nome_bot` → assegna bot e `status=bot`.
Altri comandi legacy: `/chat` (ultimi messaggi WA per studente), `/logs`, `/checked`, ecc.

## Flusso WhatsApp (app/api/whatsapp-cloud/route.ts)
1) Arriva messaggio WA → normalizza `phone_tail`, cerca studente (`black_students`) e conversazione (`black_whatsapp_conversations`). Se trova studente, collega la conversazione con `student_id` e `type=black`.
2) Upsert conversazione (status/type/bot/last_message).
3) Log messaggio su `black_whatsapp_messages`.
4) Se `status != bot` → inoltra su Telegram agli operatori (ID in `WHATSAPP_OPERATOR_CHAT_IDS`), includendo ultimi 10 messaggi; non risponde all’utente.
5) Se `status=bot`:
   - Prospect/altro: bot sales (vedi sotto), follow-up dinamico (1–6h) memorizzato su `followup_due_at`. Se confusione/frustrazione → escalation a `waiting_tutor` + notifica operatori + messaggio all’utente “ti risponde un tutor”.
   - Black: bot tutoring; se AI rileva frustrazione/complessità/richiesta di umano → `waiting_tutor`, notifica operatori, messaggio all’utente.
6) Follow-up sales: endpoint `/api/whatsapp-cloud/followup` invia recall alle conversazioni prospect/altro `status=bot` con `followup_due_at` scaduto e `followup_sent_at` null.

## Bot Sales (prospect/altro)
- Metodo Straight Line: prima raccoglie dati (classe, materia, prossima verifica/obiettivo, difficoltà, autonomia). Se mancano info, fa 1–2 domande, niente proposta.
- Quando propone: UN solo piano (Essential OPPURE Black OPPURE Mentor), con max 5–6 righe separate da righe vuote: sintesi + perk chiave + link (Essential/Black: theoremz.com/black; Mentor: theoremz.com/mentor) + follow-up breve.
- Prompt include descrizione completa dei tre livelli (Essential: risorse + AI + risolutore illimitato; Black: Essential + tutor umano in chat, onboarding, piano, 1 domanda/sett.; Mentor: Black + lezioni 1:1 settimanali, supervisione continua).
- Usa cronologia per ricordare preferenze/obiettivi e riprendere la vendita da dove era rimasta.

## Bot Black (studenti)
- Risponde con AI usando contesto studente + history.
- Escalation automatica a tutor se l’AI rileva richiesta esplicita di umano, frustrazione ripetuta, tema delicato/complesso o mancanza di contesto: cambia `status` a `waiting_tutor`, notifica Telegram (con history), invia all’utente “ti risponde un tutor a breve”.
- Immagini (WA Cloud):
  - Recupero media: tentativo primario con download binario e `data:` base64 (Graph -> signed URL -> fetch -> base64).
  - Se download fallisce, fallback sull’URL Graph firmato con `access_token` per permettere all’AI di leggerla comunque.
  - Il testo passato all’AI include una nota “è presente un’immagine allegata” solo se il webhook conteneva l’immagine; i messaggi precedenti con immagine non vengono ricaricati in cronologia, solo la foto corrente viene inviata al modello.

## Notifiche Telegram (operatori)
- Inoltri da WA includono: stato/type, numero, eventuale ID conversazione e ultimi 10 messaggi (👤 utente / 🤖 bot). Nessun ack automatico all’utente in `waiting_tutor`.

## Env chiave
- `TELEGRAM_BOT_TOKEN`, `ALLOWED_CHAT_IDS` (whitelist operatori), `WHATSAPP_OPERATOR_CHAT_IDS` (lista chat Telegram per inoltri WA).
- WhatsApp: `META_ACCESS_TOKEN`, `WHATSAPP_CLOUD_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_VERSION`.
- Cron: `BLACK_CRON_SECRET`/`CRON_SECRET`, `WHATSAPP_FOLLOWUP_SECRET`.

## Endpoint utili
- `/api/whatsapp-cloud` (webhook WA).
- `/api/whatsapp-cloud/followup?secret=...` (job recall sales).
- `/api/cron/master?secret=...` (cron unico quotidiano).
- `/api/telegram/hook` (webhook Telegram bot).
