/**
 * Costruisce un link wa.me da un numero di telefono grezzo.
 * Apre WhatsApp (o WhatsApp Business, se è l'app predefinita sul dispositivo)
 * con la chat già pronta verso quel numero. Se passi `text`, il messaggio
 * arriva già scritto nel campo (l'utente può comunque modificarlo prima di
 * inviarlo — wa.me non invia nulla in automatico).
 */
export function buildWhatsAppLink(phone?: string | null, text?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/**
 * Primo apertura suggerita per un lead: si presenta ("sono Luigi di
 * Theoremz"), fa riferimento a ciò che il lead ha scaricato in base al
 * funnel di provenienza, e chiede conferma. Personalizzato con il nome
 * quando disponibile.
 */
export function buildLeadWhatsAppMessage(input: {
  fullName?: string | null;
  source?: string | null;
}): string {
  const firstName = (input.fullName || "").trim().split(/\s+/)[0] || "";
  const greeting = firstName ? `Ciao ${firstName}` : "Ciao";

  if (input.source === "guida_metodo_pdf") {
    return `${greeting}, sono Luigi di Theoremz, ti ho chiamato al volo perché ho visto che hai scaricato la nostra guida per il metodo di studio, ti risulta?`;
  }
  if (input.source === "free_exercises_pdf") {
    return `${greeting}, sono Luigi di Theoremz, ti ho chiamato al volo perché ho visto che hai scaricato gli esercizi gratuiti su Theoremz, ti risulta?`;
  }
  return `${greeting}, sono Luigi di Theoremz, ti ho chiamato al volo, hai un minuto?`;
}
