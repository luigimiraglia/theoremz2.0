// lib/sanityRest.ts
const pid = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const ds = process.env.NEXT_PUBLIC_SANITY_DATASET!;
const v = (process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-07-23").replace(
  /^v/,
  ""
);
// per REST serve il prefisso `v` nell'URL
const API_BASE = `https://${pid}.apicdn.sanity.io/v${v}/data/query/${ds}`;

type Params = Record<string, string | number | boolean | null | undefined>;

export async function sanityREST<T = unknown>(
  groq: string,
  params?: Params
): Promise<T> {
  const q = new URLSearchParams({ query: groq });
  if (params && Object.keys(params).length) {
    q.set("params", JSON.stringify(params));
  }
  const url = `${API_BASE}?${q.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Sanity REST error ${res.status}: ${txt}`);
  }
  const json = await res.json();
  return json.result as T;
}
