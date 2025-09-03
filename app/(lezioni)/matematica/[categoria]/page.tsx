import { groq } from "next-sanity";
import { sanityFetch } from "@/lib/sanityFetch";
import type { Metadata } from "next";

type Row = { title: string; slug: { current: string } };

function unslug(s: string) {
  return s.replace(/-/g, " ");
}
function toTitle(s: string) {
  const t = unslug(s);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const LESSONS_BY_CAT = groq`*[_type=="lesson" && materia=="matematica" && count(categoria[lower(@)==$cat])>0]{ title, slug } | order(title asc)`;

export async function generateStaticParams() {
  // Retrieves all categories for matematica lessons and returns slugs
  const docs = await sanityFetch<{ categoria?: string[] }[]>(
    groq`*[_type=="lesson" && materia=="matematica"]{ categoria }`
  );
  const set = new Set<string>();
  for (const d of docs || []) {
    for (const c of d.categoria || []) set.add(c);
  }
  const slugs = Array.from(set).map((c) => c.toLowerCase().replace(/\s+/g, "-"));
  return slugs.map((categoria) => ({ categoria }));
}

export async function generateMetadata({ params }: { params: Promise<{ categoria: string }> }): Promise<Metadata> {
  const { categoria } = await params;
  const name = toTitle(categoria);
  const title = `${name} — Matematica`;
  const description = `Lezioni di ${name} con spiegazioni chiare, esempi ed esercizi.`;
  return {
    title,
    description,
    alternates: { canonical: `/matematica/${categoria}` },
    robots: { index: true, follow: true },
  };
}

export default async function Page({ params }: { params: Promise<{ categoria: string }> }) {
  const { categoria } = await params;
  const cat = categoria.toLowerCase().replace(/-/g, " ");
  const rows = await sanityFetch<Row[]>(LESSONS_BY_CAT, { cat });
  const name = toTitle(categoria);
  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{name}</h1>
      <p className="text-slate-600 mt-1">Lezioni correlate in matematica.</p>
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

