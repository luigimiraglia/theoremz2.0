const ROME_TZ = "Europe/Rome";
const ROME_YMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: ROME_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function parseYmd(input?: string | null) {
  if (!input) return null;
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return { year, month, day };
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
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
  const values: Partial<DateParts> = {};
  for (const part of parts) {
    if (part.type === "literal") continue;
    values[part.type as keyof DateParts] = Number(part.value);
  }
  const utcTs = Date.UTC(
    values.year || 0,
    (values.month || 1) - 1,
    values.day || 1,
    values.hour || 0,
    values.minute || 0,
    values.second || 0
  );
  return utcTs - date.getTime();
}

function addDaysToYmd(ymd: string, days: number) {
  const parsed = parseYmd(ymd);
  if (!parsed) return ymd;
  const base = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12));
  base.setUTCDate(base.getUTCDate() + days);
  return formatRomeYmd(base);
}

export function formatRomeYmd(date = new Date()) {
  return ROME_YMD.format(date);
}

export function romeDateToUtc(ymd: string) {
  const parsed = parseYmd(ymd);
  if (!parsed) return new Date(0);
  const utcMidnight = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 0, 0, 0));
  const offset = getTimeZoneOffset(utcMidnight, ROME_TZ);
  return new Date(utcMidnight.getTime() - offset);
}

export function addRomeDays(ymd: string, days: number) {
  return addDaysToYmd(ymd, days);
}

export function getRomeDayRange(dateParam?: string | null) {
  let ymd = "";
  if (parseYmd(dateParam)) {
    ymd = dateParam as string;
  } else if (dateParam) {
    const parsed = new Date(dateParam);
    if (!Number.isNaN(parsed.getTime())) {
      ymd = formatRomeYmd(parsed);
    }
  }
  if (!ymd) ymd = formatRomeYmd();
  const start = romeDateToUtc(ymd);
  const end = romeDateToUtc(addDaysToYmd(ymd, 1));
  return { ymd, start, end };
}

export function getRomeTodayYmd() {
  return formatRomeYmd();
}

export { ROME_TZ };
