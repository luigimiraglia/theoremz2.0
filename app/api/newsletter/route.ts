import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { track } from "@/lib/analytics";
import { syncLiteProfilePatch } from "@/lib/studentLiteSync";

// Crea client Supabase per operazioni newsletter
function getSupabaseClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error("Supabase credentials not found");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      email,
      subscribed,
      frequenza = "weekly",
      tipo_contenuti = ["lezioni", "esercizi"],
      materie_interesse = [],
      source = "profile",
      // Dati del profilo utente
      nome,
      cognome,
      classe,
      anno_scolastico,
      scuola,
    } = body;

    // Validazione base
    if (!user_id || !email) {
      return NextResponse.json(
        { error: "User ID e email sono richiesti" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    if (subscribed) {
      // Iscrizione alla newsletter
      const subscriptionData = {
        user_id,
        email,
        nome: nome || null,
        cognome: cognome || null,
        classe: classe || null,
        anno_scolastico: anno_scolastico || null,
        scuola: scuola || null,
        frequenza,
        tipo_contenuti,
        materie_interesse,
        source,
        user_agent: request.headers.get("user-agent"),
        ip_address:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
        is_active: true,
      };

      const { data, error } = await supabase
        .from("newsletter_subscriptions")
        .upsert(subscriptionData, { onConflict: "user_id" })
        .select()
        .single();

      if (error) {
        console.error("Newsletter subscription error:", error);
        return NextResponse.json(
          { error: "Errore nell'iscrizione alla newsletter" },
          { status: 500 }
        );
      }

      try {
        await syncLiteProfilePatch(user_id, {
          newsletter_opt_in: true,
          email,
          full_name: nome ? `${nome}${cognome ? ` ${cognome}` : ""}` : null,
        });
      } catch (err) {
        console.error("[newsletter] lite profile sync failed", err);
      }

      // Analytics tracking
      try {
        track("newsletter_subscribe", {
          user_id,
          email,
          frequenza,
          tipo_contenuti: tipo_contenuti.join(","),
          materie_interesse: materie_interesse.join(","),
          source,
        });
      } catch {}

      return NextResponse.json({
        success: true,
        message: "Iscrizione alla newsletter completata!",
        data,
      });
    } else {
      // Disiscrizione dalla newsletter
      const { error } = await supabase
        .from("newsletter_subscriptions")
        .update({
          is_active: false,
          unsubscribed_at: new Date().toISOString(),
        })
        .eq("user_id", user_id);

      if (error) {
        console.error("Newsletter unsubscribe error:", error);
        return NextResponse.json(
          { error: "Errore nella disiscrizione" },
          { status: 500 }
        );
      }

      try {
        await syncLiteProfilePatch(user_id, {
          newsletter_opt_in: false,
        });
      } catch (err) {
        console.error("[newsletter] lite profile sync failed", err);
      }

      // Analytics tracking
      try {
        track("newsletter_unsubscribe", {
          user_id,
          email,
          source,
        });
      } catch {}

      return NextResponse.json({
        success: true,
        message: "Disiscrizione completata",
      });
    }
  } catch (error) {
    console.error("Newsletter API error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json({ error: "User ID richiesto" }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Ottieni stato iscrizione corrente
    const { data, error } = await supabase
      .from("newsletter_subscriptions")
      .select("*")
      .eq("user_id", user_id)
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Newsletter get error:", error);
      return NextResponse.json(
        { error: "Errore nel recupero dati" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscribed: !!data,
      subscription: data || null,
    });
  } catch (error) {
    console.error("Newsletter GET error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
