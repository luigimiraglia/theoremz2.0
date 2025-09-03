import { groq } from "next-sanity";
import { sanityFetch } from "@/lib/sanityFetch";
import type { Metadata } from "next";

type Row = { title: string; slug: { current: string } };

const Q = groq`*[_type=="lesson" && count(classe[@==$label])>0]{ title, slug } | order(title asc)`;

export async function generateStaticParams() {
  // Build from classes present in Sanity that end with "Media"
  const docs = await sanityFetch<{ classe?: string[] }[]>(groq`*[_type=="lesson"]{ classe }`);
  const years = new Set<number>();
  for (const d of docs || []) {
    for (const c of d.classe || []) {
      const m = c.match(/^(\d+)º\s+Media$/i);
      if (m) years.add(Number(m[1]));
    }
  }
  return Array.from(years).map((n) => ({ anno: String(n) }));
}

export async function generateMetadata({ params }: { params: Promise<{ anno: string }> }): Promise<Metadata> {
  const { anno } = await params;
  const title = `${anno}º Media — Percorso`;
  const description = `Lezioni consigliate per ${anno}º Media: matematica e scienze con spiegazioni chiare ed esercizi.`;
  return { title, description, alternates: { canonical: `/scuola/media/${anno}` } };
}

export default async function Page({ params }: { params: Promise<{ anno: string }> }) {
  const { anno } = await params;
  const label = `${anno}º Media`;
  const rows = await sanityFetch<Row[]>(Q, { label });
  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{label}</h1>
      <p className="text-slate-600 mt-1">Lezioni consigliate per la tua classe.</p>
      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(rows || []).map((r) => (
          <li key={r.slug.current} className="rounded-2xl bg-white/80 border border-slate-200 p-3">
            <a href={`/${r.slug.current}`} className="font-semibold text-[#1a5fd6] hover:underline">
              {r.title}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}

