const BOOKING_TZ = "Europe/Rome";

type DateParts = { year: number; month: number; day: number };
type TimeParts = { hours: number; minutes: number };

function parseYmd(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day } as DateParts;
}

function parseTime(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes } as TimeParts;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  const utcTs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return utcTs - date.getTime();
}

export function bookingIsoFromParts(date: string, time: string) {
  const dateParts = parseYmd(date);
  const timeParts = parseTime(time);
  if (!dateParts || !timeParts) return null;
  const { year, month, day } = dateParts;
  const { hours, minutes } = timeParts;
  const guessUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  const offset = getTimeZoneOffset(guessUtc, BOOKING_TZ);
  return new Date(guessUtc.getTime() - offset).toISOString();
}

export function bookingIsoToParts(iso?: string | null) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: BOOKING_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const time = `${get("hour")}:${get("minute")}`;
  return { date, time };
}

export function formatBookingDate(
  iso?: string | null,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" }
) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("it-IT", { timeZone: BOOKING_TZ, ...options });
}

export function formatBookingTime(
  iso?: string | null,
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }
) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("it-IT", { timeZone: BOOKING_TZ, ...options });
}

export function formatBookingDateTime(
  iso?: string | null,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }
) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("it-IT", { timeZone: BOOKING_TZ, ...options });
}

export function bookingNowMs() {
  return Date.now();
}
