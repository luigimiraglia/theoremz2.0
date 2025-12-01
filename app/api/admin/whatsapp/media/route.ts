import { NextRequest, NextResponse } from "next/server";

const WHATSAPP_GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v20.0";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim() || "";
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN?.trim() || "";

async function requireAdmin(request: NextRequest) {
  if (process.env.NODE_ENV === "development") return null;
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length);
  try {
    const { adminAuth } = await import("@/lib/firebaseAdmin");
    const decoded = await adminAuth.verifyIdToken(token);
    if ((decoded.email || "").toLowerCase() !== "luigi.miraglia006@gmail.com") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return null;
  } catch (error) {
    console.error("[admin/wa/media] auth error", error);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  if (!META_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    return NextResponse.json({ error: "missing_whatsapp_config" }, { status: 500 });
  }
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  try {
    const url = `https://graph.facebook.com/${WHATSAPP_GRAPH_VERSION}/${id}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `graph_meta_${res.status}` }, { status: 502 });
    }
    const metaContentType = res.headers.get("content-type") || "";
    if (metaContentType.includes("application/json")) {
      const metaJson = await res.json();
      const mediaUrl = metaJson?.url;
      if (!mediaUrl) {
        return NextResponse.json({ error: "missing_media_url" }, { status: 502 });
      }
      const mediaRes = await fetch(mediaUrl, {
        headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` },
      });
      if (!mediaRes.ok) {
        return NextResponse.json({ error: `graph_media_${mediaRes.status}` }, { status: 502 });
      }
      const buff = await mediaRes.arrayBuffer();
      const contentType = mediaRes.headers.get("content-type") || "image/jpeg";
      return new NextResponse(Buffer.from(buff), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    // Metadata already returned the binary
    const buff = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return new NextResponse(Buffer.from(buff), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[admin/wa/media] fetch failed", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
