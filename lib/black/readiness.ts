import { supabaseServer } from "@/lib/supabase";

type SupabaseClient = ReturnType<typeof supabaseServer>;

const CHUNK_SIZE = 500;

type BaseOptions = {
  db?: SupabaseClient;
  stamp?: string;
};

export async function resetReadiness(options: BaseOptions = {}) {
  const db = options.db ?? supabaseServer();
  const stamp = options.stamp || new Date().toISOString();
  const { data, error } = await db.from("black_students").select("id");
  if (error) throw new Error(`readiness_reset_fetch_failed: ${error.message}`);
  if (!data?.length) return { updated: 0 };
  const updates = data.map((row) => ({
    id: row.id,
    readiness: 100,
    updated_at: stamp,
  }));
  await applyChunks(db, updates);
  return { updated: updates.length };
}

export async function decayReadiness(options: BaseOptions = {}) {
  const db = options.db ?? supabaseServer();
  const stamp = options.stamp || new Date().toISOString();
  const { data, error } = await db.from("black_students").select("id, readiness");
  if (error) throw new Error(`readiness_decay_fetch_failed: ${error.message}`);
  if (!data?.length) return { processed: 0, decreased: 0 };
  const updates = data
    .map((row) => {
      const current = Number(row.readiness ?? 0);
      if (!Number.isFinite(current) || current <= 0) return null;
      return {
        id: row.id,
        readiness: Math.max(0, current - 1),
        updated_at: stamp,
      };
    })
    .filter(Boolean) as Array<{ id: string; readiness: number; updated_at: string }>;
  if (updates.length) {
    await applyChunks(db, updates);
  }
  return { processed: data.length, decreased: updates.length };
}

async function applyChunks(
  db: SupabaseClient,
  rows: Array<{ id: string; readiness: number; updated_at: string }>,
) {
  const chunks = chunk(rows, CHUNK_SIZE);
  for (const part of chunks) {
    const { error } = await db
      .from("black_students")
      .upsert(part, { onConflict: "id" });
    if (error) throw new Error(`readiness_upsert_failed: ${error.message}`);
  }
}

function chunk<T>(input: T[], size: number): T[][] {
  if (input.length <= size) return [input];
  const parts: T[][] = [];
  for (let i = 0; i < input.length; i += size) {
    parts.push(input.slice(i, i + size));
  }
  return parts;
}
