# ManyChat ⇆ Theoremz Black WhatsApp Webhook

Questa nota spiega come funziona l'endpoint `/api/manychat/whatsapp` e come collegarlo a ManyChat per rispondere ai messaggi WhatsApp con l'AI di OpenAI quando lo studente è abbonato a Theoremz Black.

## Flusso in breve

1. ManyChat invia un `POST` all'endpoint con il testo ricevuto su WhatsApp e il numero dello studente.
2. L'API cerca il contatto su Supabase (tabelle `black_students` → `student_profiles`).
3. Se il profilo risulta Black attivo, genera la risposta usando OpenAI impersonando Luigi.
4. La risposta viene rimandata a ManyChat nel formato `External Request`, pronta per essere inviata allo studente: è in prima persona (Luigi), senza firme e senza inviti a call.
5. Se il numero non è ancora associato a uno studente Black, il bot crea una conversazione “lead” (tabella `black_whatsapp_inquiries`), distingue tra richieste commerciali e domande scolastiche e gestisce:
   - **Richieste info/prezzi** → AI commerciale che spiega Theoremz Black e salva lo storico nel DB.
   - **Domande scolastiche/altro** → chiede la mail dell'account per collegare il profilo.
   - **Email fornite** → se trovate in Supabase, il numero viene collegato allo studente e la conversazione passa automaticamente al flusso Black; se l'email non esiste, viene richiesto di reinserirla.
6. La risposta allo studente usa il campo `black_students.student_name` (se presente) per evitare di citare il nome del genitore; in fallback usa ancora `profiles.full_name`/email.

## Variabili d'ambiente

Imposta questi valori in `.env.local`, Vercel o nell'infrastruttura di deploy:

| Variabile                      | Obbligatoria   | Note                                                                                                                                                      |
| ------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`               | ✅             | Chiave API OpenAI. Senza questa l'endpoint risponde con `missing_openai_api_key`.                                                                         |
| `MANYCHAT_WEBHOOK_SECRET`      | ⚠️ Consigliato | Token condiviso. ManyChat deve aggiungerlo nell'header `Authorization: Bearer <token>` per evitare chiamate non autorizzate.                              |
| `MANYCHAT_WHATSAPP_PERSONA`    | opzionale      | Override del prompt di sistema (default: Luigi Miraglia, tono WhatsApp). Useful se vuoi cambiare stile.                                                   |
| `MANYCHAT_OPENAI_MODEL`        | opzionale      | Default `gpt-4o-mini`. Cambialo se vuoi un modello diverso.                                                                                               |
| `MANYCHAT_OPENAI_TEMPERATURE`  | opzionale      | Default `0.4`. Valore numerico compatibile con OpenAI.                                                                                                    |
| `MANYCHAT_OPENAI_MAX_TOKENS`   | opzionale      | Default `320`. Limita la lunghezza delle risposte.                                                                                                        |
| `MANYCHAT_OPENAI_VISION_MODEL` | opzionale      | Se non lo imposti, l'API prova prima `gpt-4o` e se non disponibile torna al modello testuale. Impostalo solo se vuoi forzare un modello vision specifico. |

## Payload atteso

L'endpoint prova a estrarre:

- Numero WhatsApp da chiavi come `subscriber.phone`, `contact.phone`, `data.raw_message.from`, o qualsiasi campo con `phone` nel nome.
- Testo del messaggio da `message.text`, `raw_message.text`, `data.message.body`, `text`, ecc.

Per i messaggi con immagine puoi usare l'endpoint dedicato `POST /api/manychat/whatsapp/image` passando anche `image_url` (pubblico o data-uri). L'AI recupera la cronologia dal numero, quindi il corpo minimo può essere:

```json
{
  "phone": "{{contact.phone}}",
  "image_url": "{{last_received_attachment}}"
}
```

Il testo è opzionale: se vuoi includerlo, aggiungi `"text": "{{last_received_input}}"`. In assenza, il backend usa un prompt standard (“Guarda l'immagine…”).

> Nota: l'API scarica l'immagine da `image_url` e la converte in base64 prima di mandarla a OpenAI. Assicurati che il link sia pubblico (o firmato) e che il file sia <6MB, altrimenti tornerà il fallback “non riesco a vedere l'immagine”.

Esempio minimale di payload funzionante (da usare nell'External Request di ManyChat):

```json
{
  "subscriber": {
    "id": "{{contact.id}}",
    "phone": "{{contact.phone}}",
    "name": "{{contact.full_name}}"
  },
  "message": {
    "text": "{{last_received_input}}"
  }
}
```

L'API restituisce sempre un JSON conforme a ManyChat v2:

```json
{
  "version": "v2",
  "content": {
    "type": "text",
    "text": "Risposta generata"
  },
  "black": true
}
```

Il campo `black` è `true` solo se il numero è stato agganciato a uno studente Black attivo; in fallback o per numeri non riconosciuti rimane `false`.

## Log conversazioni su Supabase

Ogni messaggio WhatsApp (testo studente + risposta AI) viene salvato su `black_whatsapp_messages` e la cronologia recente viene ripassata (max 20 messaggi) al modello OpenAI. Quando lo storico supera i 70 messaggi, il sistema chiede a GPT di riassumere l'intera chat e fonde il risultato con `black_students.ai_description`, poi elimina i 50 messaggi più vecchi per tenere leggera la cronologia. Se non l'hai ancora creata, usa questa SQL su Supabase:

```sql
alter table if exists public.black_students
  add column if not exists student_name text;

create table if not exists public.black_whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.black_students(id) on delete set null,
  phone_tail text,
  role text not null check (role in ('user','assistant')),
  content text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists black_whatsapp_messages_student_id_idx
  on public.black_whatsapp_messages(student_id, created_at desc);

create index if not exists black_whatsapp_messages_phone_tail_idx
  on public.black_whatsapp_messages(phone_tail, created_at desc);

create table if not exists public.black_whatsapp_inquiries (
  id uuid primary key default gen_random_uuid(),
  phone_tail text unique not null,
  intent text not null default 'info',
  status text not null default 'open',
  email text,
  message_count integer default 0,
  meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz
);

create unique index if not exists black_whatsapp_inquiries_phone_tail_key
  on public.black_whatsapp_inquiries(phone_tail);
```

> `phone_tail` contiene le ultime 10 cifre del numero, così da collegare anche i contatti senza profilazione completa. Solo gli ultimi 20 messaggi vengono passati all'AI per ogni risposta; il resto viene compresso nel summary quando superi i 70 messaggi totali.

## Configurazione ManyChat (WhatsApp)

1. **Automation → Flows**: crea (o apri) il flow associato all'evento "Incoming Message" del canale WhatsApp.
2. Aggiungi un blocco **External Request** subito dopo l'evento. Configuralo così:
   - **URL**: `https://theoremz.com/api/manychat/whatsapp` (oppure il dominio dello staging).
   - **Metodo**: `POST`
   - **Headers**: `Content-Type: application/json` e `Authorization: Bearer <MANYCHAT_WEBHOOK_SECRET>`.
   - **Body**: JSON come nell'esempio sopra con i merge field di ManyChat (`{{contact.phone}}`, `{{last_received_input}}`, ecc.).
3. Imposta l'opzione "Response Mapping" del blocco per usare il testo di ritorno. In genere basta collegare la risposta del webhook a un blocco "Send Message" con il contenuto `{{request.body.content.text}}`. Se vuoi sapere se il contatto è stato riconosciuto come Black, mappa anche `$.black` in un Custom Field boolean (es. `Ai__Is_Black`).
4. Collega eventuali fallback (es. se la risposta contiene "non trovo un profilo" manda a un umano).
5. Per le immagini crea un secondo External Request che punta a `/api/manychat/whatsapp/image`, inviando almeno `phone` e `image_url` (puoi aggiungere `text` se la foto ha una caption). Il blocco di risposta è identico al flow testuale.

## Debug & test

- **Ping rapido**: `GET /api/manychat/whatsapp` restituisce `{ "ok": true }` ed è utile per verificare routing e deploy.
- **Verifica Supabase**: assicurati che il numero sia salvato su `black_students.student_phone` (o `parent_phone`). L'aggancio ignora il prefisso e confronta solo le ultime 10 cifre (stesso comportamento per `student_profiles.phone`).
- **Log**: tutti gli errori operativi vengono loggati lato server con prefisso `[manychat-whatsapp]`.

## Comportamento di fallback

- Se il numero non è trovato, l'endpoint genera comunque la risposta AI usando un profilo "guest" (quindi niente dati extra, solo il contenuto del messaggio). Se invece troviamo il contatto ma risulta non-Black, blocchiamo ancora la risposta e mostriamo il messaggio di cortesia.
- Se OpenAI dà errore, inviamo una risposta di errore soft e ManyChat può riprovare o deviare il flusso.

Adatta il flow di ManyChat per intercettare questi messaggi e inoltrarli a un operatore umano se necessario.
