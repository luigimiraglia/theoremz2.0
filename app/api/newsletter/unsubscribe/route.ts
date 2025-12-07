import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase credentials missing");
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalized = String(email || "")
      .trim()
      .toLowerCase();

    if (!normalized || !normalized.includes("@")) {
      return NextResponse.json(
        { error: "Email mancante o non valida" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { error, count } = await supabase
      .from("newsletter_subscriptions")
      .update({
        is_active: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("email", normalized);

    if (error) {
      console.error("[newsletter/unsubscribe] update error", error);
      return NextResponse.json(
        { error: "Errore nella disiscrizione" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        count && count > 0
          ? "Disiscrizione completata"
          : "Se l'email era iscritta, è stata disattivata",
    });
  } catch (err) {
    console.error("[newsletter/unsubscribe] unexpected error", err);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
