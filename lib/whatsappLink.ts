/**
 * Costruisce un link wa.me da un numero di telefono grezzo.
 * Apre WhatsApp (o WhatsApp Business, se è l'app predefinita sul dispositivo)
 * con la chat già pronta verso quel numero.
 */
export function buildWhatsAppLink(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}`;
}
