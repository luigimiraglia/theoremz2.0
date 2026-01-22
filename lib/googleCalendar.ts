import { randomUUID } from "crypto";
import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";
const DEFAULT_TZ = process.env.GOOGLE_CALENDAR_TZ || "Europe/Rome";

export type CalendarEventInput = {
  bookingId?: string | null;
  summary: string;
  description?: string;
  startIso: string;
  endIso: string;
  attendees?: Array<{ email: string }>;
  useFloatingTime?: boolean;
  timeZone?: string;
  createMeet?: boolean;
};

let calendarClient: calendar_v3.Calendar | null = null;

function getCalendarClient() {
  if (calendarClient) return calendarClient;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) return null;
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  calendarClient = google.calendar({ version: "v3", auth });
  return calendarClient;
}

function toFloatingDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(
    date.getUTCHours(),
  )}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

export async function createGoogleCalendarEvent(input: CalendarEventInput) {
  const calendar = getCalendarClient();
  if (!calendar) return { skipped: true, meetLink: null } as const;

  const useFloating = Boolean(input.useFloatingTime);
  const startValue = useFloating ? toFloatingDateTime(input.startIso) : input.startIso;
  const endValue = useFloating ? toFloatingDateTime(input.endIso) : input.endIso;
  if (!startValue || !endValue) throw new Error("Invalid calendar event time");

  const timeZone = useFloating ? input.timeZone || DEFAULT_TZ : undefined;
  const requestId = input.bookingId ? `booking-${input.bookingId}` : randomUUID();

  const event: calendar_v3.Schema$Event = {
    summary: input.summary,
    description: input.description,
    start: timeZone ? { dateTime: startValue, timeZone } : { dateTime: startValue },
    end: timeZone ? { dateTime: endValue, timeZone } : { dateTime: endValue },
    attendees: input.attendees,
    conferenceData: input.createMeet === false
      ? undefined
      : {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
    extendedProperties: input.bookingId
      ? { private: { bookingId: String(input.bookingId) } }
      : undefined,
  };

  const response = await calendar.events.insert({
    calendarId: GOOGLE_CALENDAR_ID,
    requestBody: event,
    conferenceDataVersion: input.createMeet === false ? 0 : 1,
    sendUpdates: "none",
  });

  const meetLink =
    response.data.hangoutLink ||
    response.data.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")
      ?.uri ||
    null;

  return { skipped: false, event: response.data, meetLink } as const;
}
