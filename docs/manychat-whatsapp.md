# ManyChat ⇆ Theoremz Black WhatsApp Webhook

Questa nota spiega come funziona l'endpoint `/api/manychat/whatsapp` e come collegarlo a ManyChat per rispondere ai messaggi WhatsApp con l'AI di OpenAI quando lo studente è abbonato a Theoremz Black.

## Flusso in breve
1. ManyChat invia un `POST` all'endpoint con il testo ricevuto su WhatsApp e il numero dello studente.
2. L'API cerca il contatto su Supabase (tabelle `black_students` → `student_profiles`).
3. Se il profilo risulta Black attivo, genera la risposta usando OpenAI impersonando Luigi.
4. La risposta viene rimandata a ManyChat nel formato `External Request`, pronta per essere inviata allo studente: è in prima persona (Luigi), senza firme e senza inviti a call.

## Variabili d'ambiente
Imposta questi valori in `.env.local`, Vercel o nell'infrastruttura di deploy:

| Variabile | Obbligatoria | Note |
| --- | --- | --- |
| `OPENAI_API_KEY` | ✅ | Chiave API OpenAI. Senza questa l'endpoint risponde con `missing_openai_api_key`. |
| `MANYCHAT_WEBHOOK_SECRET` | ⚠️ Consigliato | Token condiviso. ManyChat deve aggiungerlo nell'header `Authorization: Bearer <token>` per evitare chiamate non autorizzate. |
| `MANYCHAT_WHATSAPP_PERSONA` | opzionale | Override del prompt di sistema (default: Luigi Miraglia, tono WhatsApp). Useful se vuoi cambiare stile. |
| `MANYCHAT_OPENAI_MODEL` | opzionale | Default `gpt-4o-mini`. Cambialo se vuoi un modello diverso. |
| `MANYCHAT_OPENAI_TEMPERATURE` | opzionale | Default `0.4`. Valore numerico compatibile con OpenAI. |
| `MANYCHAT_OPENAI_MAX_TOKENS` | opzionale | Default `320`. Limita la lunghezza delle risposte. |

## Payload atteso
L'endpoint prova a estrarre:
- Numero WhatsApp da chiavi come `subscriber.phone`, `contact.phone`, `data.raw_message.from`, o qualsiasi campo con `phone` nel nome.
- Testo del messaggio da `message.text`, `raw_message.text`, `data.message.body`, `text`, ecc.

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

## Configurazione ManyChat (WhatsApp)
1. **Automation → Flows**: crea (o apri) il flow associato all'evento "Incoming Message" del canale WhatsApp.
2. Aggiungi un blocco **External Request** subito dopo l'evento. Configuralo così:
   - **URL**: `https://theoremz.com/api/manychat/whatsapp` (oppure il dominio dello staging).
   - **Metodo**: `POST`.
   - **Headers**: `Content-Type: application/json` e `Authorization: Bearer <MANYCHAT_WEBHOOK_SECRET>`.
   - **Body**: JSON come nell'esempio sopra con i merge field di ManyChat (`{{contact.phone}}`, `{{last_received_input}}`, ecc.).
3. Imposta l'opzione "Response Mapping" del blocco per usare il testo di ritorno. In genere basta collegare la risposta del webhook a un blocco "Send Message" con il contenuto `{{request.body.content.text}}`. Se vuoi sapere se il contatto è stato riconosciuto come Black, mappa anche `$.black` in un Custom Field boolean (es. `Ai__Is_Black`).
4. Collega eventuali fallback (es. se la risposta contiene "non trovo un profilo" manda a un umano).

## Debug & test
- **Ping rapido**: `GET /api/manychat/whatsapp` restituisce `{ "ok": true }` ed è utile per verificare routing e deploy.
- **Verifica Supabase**: assicurati che il numero sia salvato su `black_students.student_phone` (o `parent_phone`). L'aggancio ignora il prefisso e confronta solo le ultime 10 cifre (stesso comportamento per `student_profiles.phone`).
- **Log**: tutti gli errori operativi vengono loggati lato server con prefisso `[manychat-whatsapp]`.

## Comportamento di fallback
- Se il numero non è trovato, l'endpoint genera comunque la risposta AI usando un profilo "guest" (quindi niente dati extra, solo il contenuto del messaggio). Se invece troviamo il contatto ma risulta non-Black, blocchiamo ancora la risposta e mostriamo il messaggio di cortesia.
- Se OpenAI dà errore, inviamo una risposta di errore soft e ManyChat può riprovare o deviare il flusso.

Adatta il flow di ManyChat per intercettare questi messaggi e inoltrarli a un operatore umano se necessario.
