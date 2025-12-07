import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { supabaseServer } from "@/lib/supabase";

function getUid(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  return adminAuth
    .verifyIdToken(token)
    .then((d) => d.uid as string)
    .catch(() => null);
}

function getWeekRangeRome() {
  const nowRome = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }),
  );
  nowRome.setHours(0, 0, 0, 0);
  const weekday = (nowRome.getDay() + 6) % 7; // lun=0
  const start = new Date(nowRome);
  start.setDate(nowRome.getDate() - weekday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export async function GET(request: Request) {
  const uid = await getUid(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseServer();
  if (!db) {
    return NextResponse.json({ error: "missing_supabase" }, { status: 500 });
  }

  const { startIso, endIso } = getWeekRangeRome();

  const { data, error } = await db
    .from("call_bookings")
    .select(
      `
        id,
        status,
        booked_at,
        slot:call_slots!inner(starts_at, ends_at),
        call_type:call_types!inner(slug, name)
      `,
    )
    .eq("user_id", uid)
    .eq("status", "confirmed")
    .eq("call_types.slug", "check-percorso")
    .gte("call_slots.starts_at", startIso)
    .lte("call_slots.starts_at", endIso)
    .limit(10);

  if (error) {
    console.error("[weekly-check-call] supabase error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const booking = Array.isArray(data)
    ? data
        .filter((b) => b?.slot?.starts_at)
        .sort((a, b) => (a.slot.starts_at || "").localeCompare(b.slot.starts_at || ""))[0]
    : null;

  return NextResponse.json({
    hasBooking: Boolean(booking),
    booking: booking
      ? {
          id: booking.id,
          status: booking.status,
          startsAt: booking.slot?.starts_at || null,
          endsAt: booking.slot?.ends_at || null,
          callType: booking.call_type?.slug || null,
          callTypeName: booking.call_type?.name || null,
        }
      : null,
    weekStart: startIso,
    weekEnd: endIso,
  });
}
