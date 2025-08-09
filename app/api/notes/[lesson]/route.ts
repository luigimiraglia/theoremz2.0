// app/api/notes/[lesson]/route.ts
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lesson: string }> }
) {
  const { lesson } = await params;
  const dir = path.join(process.cwd(), "public", "notes", lesson);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".pdf"))
      .map((e) => {
        const raw = e.name;
        return {
          name: raw.replace(/\.pdf$/i, "").replace(/[_\s]+/g, " "),
          url: `/notes/${encodeURIComponent(lesson)}/${encodeURIComponent(raw)}`, // <- importante
        };
      });
    return NextResponse.json({ files });
  } catch (err: any) {
    return NextResponse.json(
      { files: [], error: err.message },
      { status: 200 }
    );
  }
}
