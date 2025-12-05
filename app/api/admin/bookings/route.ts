import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = supabaseServer();
    if (!db) {
      return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
    }

    const { data, error } = await db
      .from("call_bookings")
      .select(
        `
          id,
          slot:call_slots (
            id,
            starts_at,
            duration_min,
            status,
            call_type:call_types ( id, slug, name ),
            tutor:tutors ( id, display_name )
          ),
          full_name,
          email,
          note,
          booked_at
        `,
      )
      .order("booked_at", { ascending: false })
      .limit(500);

    if (error) {
      throw new Error(error.message);
    }

    const bookings =
      data?.map((row: any) => {
        const slot = row.slot || {};
        return {
          id: row.id as string,
          fullName: row.full_name as string,
          email: row.email as string,
          note: row.note as string | null,
          bookedAt: row.booked_at as string,
          startsAt: slot.starts_at as string,
          durationMin: slot.duration_min as number | null,
          status: slot.status as string | null,
          callType: slot.call_type?.slug as string | null,
          callTypeName: slot.call_type?.name as string | null,
          tutorName: slot.tutor?.display_name as string | null,
        };
      }) ?? [];

    return NextResponse.json({ bookings });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Errore prenotazioni" }, { status: 500 });
  }
}
