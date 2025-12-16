import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { supabaseServer } from "@/lib/supabase";

async function getUid(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid as string;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const uid = await getUid(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "missing_supabase" }, { status: 500 });

  const nowIso = new Date().toISOString();

  const { data, error } = await db
    .from("call_bookings")
    .select(
      `
        id,
        status,
        slot:call_slots!inner(starts_at, ends_at),
        call_type:call_types!inner(slug, name)
      `,
    )
    .eq("user_id", uid)
    .eq("status", "confirmed")
    .gte("call_slots.starts_at", nowIso)
    .order("call_slots.starts_at", { ascending: true })
    .limit(1);

  if (error) {
    console.error("[me/next-booking] supabase error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const booking = Array.isArray(data) && data.length ? data[0] : null;

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
  });
}
