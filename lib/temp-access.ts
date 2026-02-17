// lib/temp-access.ts
/**
 * Sistema per gestire accessi temporanei hardcodati alle features subscribed
 * Le email vengono configurate con una data di scadenza
 */

export type TempAccessEntry = {
  email: string;
  expiresAt: string; // ISO string date
  reason?: string; // motivo dell'accesso temporaneo
  grantedAt?: string; // quando è stato concesso
};

// Email hardcodate con accesso temporaneo (14 giorni di default)
const TEMP_ACCESS_EMAILS_RAW: TempAccessEntry[] = [
  // Esempio attivo per testing (rimuovi dopo il test)
  {
    email: "theoremz.team@gmail.com",
    expiresAt: "2025-11-08T18:40:18.699Z",
    reason: "Theoremz Mentor Prova",
    grantedAt: "2025-10-25T18:39:40.699Z",
  },
  {
    email: "amerubini@gmail.com",
    expiresAt: "2025-11-08T18:39:40.325Z",
    reason: "Theoremz Mentor Prova",
    grantedAt: "2025-10-25T18:39:40.325Z",
  },
  {
    email: "difrusciamarisa@gmail.com",
    expiresAt: "2025-11-28T18:26:59.106Z",
    reason: "Abbonamento black",
    grantedAt: "2025-10-29T18:26:59.106Z",
  },
  {
    email: "marchesidiego07@gmail.com",
    expiresAt: "2025-11-21T18:55:49.886Z",
    reason: "Prova Theoremz Mentor",
    grantedAt: "2025-11-14T18:55:49.886Z",
  },
  {
    email: "bettaconti@hotmail.it",
    expiresAt: "2099-12-31T23:59:59.000Z",
    reason: "Accesso Black (indeterminato)",
    grantedAt: "2026-02-17T00:00:00.000Z",
  },

  // Aggiungi qui nuove email generate dal pannello admin:
  // (usa il componente TempAccessAdmin in /admin/analytics per generare il codice)
];

// Normalizza tutte le email in lowercase per garantire confronti case-insensitive
const TEMP_ACCESS_EMAILS: TempAccessEntry[] = TEMP_ACCESS_EMAILS_RAW.map(
  (entry) => ({
    ...entry,
    email: entry.email.toLowerCase().trim(),
  })
);

/**
 * Verifica se un'email ha accesso temporaneo valido
 */
export function hasTempAccess(email: string | null | undefined): boolean {
  if (!email) return false;

  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date();

  return TEMP_ACCESS_EMAILS.some((entry) => {
    // Le email nell'array sono già normalizzate, quindi confronto diretto
    if (entry.email !== normalizedEmail) return false;

    const expiresAt = new Date(entry.expiresAt);
    return now <= expiresAt;
  });
}

/**
 * Ottiene le informazioni di accesso temporaneo per un'email
 */
export function getTempAccessInfo(
  email: string | null | undefined
): TempAccessEntry | null {
  if (!email) return null;

  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date();

  const entry = TEMP_ACCESS_EMAILS.find(
    // Le email nell'array sono già normalizzate, quindi confronto diretto
    (entry) => entry.email === normalizedEmail
  );

  if (!entry) return null;

  const expiresAt = new Date(entry.expiresAt);
  if (now > expiresAt) return null; // Scaduto

  return entry;
}

/**
 * Ottiene tutte le email con accesso temporaneo (incluse quelle scadute)
 */
export function getAllTempAccessEmails(): TempAccessEntry[] {
  return [...TEMP_ACCESS_EMAILS];
}

/**
 * Ottiene solo le email con accesso temporaneo ancora valido
 */
export function getActiveTempAccessEmails(): TempAccessEntry[] {
  const now = new Date();
  return TEMP_ACCESS_EMAILS.filter((entry) => {
    const expiresAt = new Date(entry.expiresAt);
    return now <= expiresAt;
  });
}

/**
 * Helper per aggiungere facilmente una nuova email con accesso temporaneo
 * (da usare manualmente nel codice)
 */
export function createTempAccessEntry(
  email: string,
  daysFromNow: number = 14,
  reason?: string
): TempAccessEntry {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);

  return {
    email: email.toLowerCase().trim(),
    expiresAt: expiresAt.toISOString(),
    reason,
    grantedAt: now.toISOString(),
  };
}

/**
 * Helper per formattare la data di scadenza
 */
export function formatExpiryDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
