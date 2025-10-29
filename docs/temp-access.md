# Sistema di Accessi Temporanei

Questo sistema permette di hardcodare email che possono accedere alle features subscribed per un periodo di tempo limitato.

## Come funziona

1. **Configurazione**: Le email con accesso temporaneo sono configurate nel file `lib/temp-access.ts`
2. **Verifica**: Il sistema controlla automaticamente se un'email ha accesso temporaneo valido in `lib/AuthContext.tsx`
3. **Scadenza**: Gli accessi scadono automaticamente alla data specificata
4. **UI**: L'utente vede un banner informativo nell'area account se ha accesso temporaneo

## Come aggiungere un nuovo accesso temporaneo

### Metodo 1: Tramite pannello admin (raccomandato)

1. Vai su `/admin/analytics`
2. Clicca sul tab "Accessi Temporanei"
3. Compila il form con:
   - Email dell'utente
   - Numero di giorni (default: 14)
   - Motivo opzionale
4. Clicca "Genera Codice" - il codice verrà copiato negli appunti
5. Incolla il codice nell'array `TEMP_ACCESS_EMAILS` in `lib/temp-access.ts`
6. Fai il deploy o riavvia l'app

### Metodo 2: Manualmente

Aggiungi una voce nell'array `TEMP_ACCESS_EMAILS` in `lib/temp-access.ts`:

```typescript
{
  email: "utente@example.com",
  expiresAt: "2025-11-08T23:59:59.999Z", // Data di scadenza in formato ISO
  reason: "Trial periodo", // Opzionale
  grantedAt: "2025-10-25T00:00:00.000Z" // Opzionale
}
```

## Priorità di accesso

Il sistema verifica l'accesso in questo ordine:

1. **Accessi temporanei** (controllati per primi)
2. **Override permanenti** (variabili ambiente)
3. **Subscription Stripe** (fallback)

## File coinvolti

- `lib/temp-access.ts` - Configurazione e logica degli accessi temporanei
- `lib/AuthContext.tsx` - Integrazione con il sistema di autenticazione
- `components/TempAccessInfo.tsx` - Banner informativo per l'utente
- `components/TempAccessAdmin.tsx` - Pannello admin per gestire gli accessi
- `app/(account)/account/page.tsx` - Mostra il banner nell'area account
- `app/admin/analytics/page.tsx` - Include il pannello admin

## Funzioni disponibili

- `hasTempAccess(email)` - Verifica se un'email ha accesso temporaneo valido
- `getTempAccessInfo(email)` - Ottiene le informazioni di accesso per un'email
- `getAllTempAccessEmails()` - Ottiene tutte le email (incluse scadute)
- `getActiveTempAccessEmails()` - Ottiene solo le email con accesso valido
- `createTempAccessEntry(email, days, reason)` - Helper per creare nuove voci
- `formatExpiryDate(isoString)` - Formatta le date per la UI

## Sicurezza

- Gli accessi temporanei non possono essere estesi automaticamente
- Quando un accesso scade, l'utente perde immediatamente l'accesso
- Le email scadute rimangono nel codice ma vengono ignorate dal sistema
- Il sistema usa cache con sessionStorage per prestazioni (cache invalidata automaticamente)

## Esempio di utilizzo completo

```typescript
// 1. Aggiungi in lib/temp-access.ts
{
  email: "mario.rossi@studente.com",
  expiresAt: "2025-11-10T23:59:59.999Z", // 14 giorni da oggi
  reason: "Demo per scuola XYZ",
  grantedAt: "2025-10-27T00:00:00.000Z"
}

// 2. L'utente mario.rossi@studente.com ora ha accesso alle funzionalità premium
// 3. Vede un banner nell'area account con le info di scadenza
// 4. Il 10 novembre 2025 l'accesso scade automaticamente
```
