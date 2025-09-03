import { groq } from "next-sanity";
import { sanityFetch } from "@/lib/sanityFetch";
import type { Metadata } from "next";

type Row = { title: string; slug: { current: string } };

function titleCase(s: string) {
  return s
    .split(/[-\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const Q = groq`*[_type=="lesson" && count(classe[@==$label])>0]{ title, slug } | order(title asc)`;

export async function generateStaticParams() {
  const docs = await sanityFetch<{ classe?: string[] }[]>(groq`*[_type=="lesson"]{ classe }`);
  const set = new Set<{ indirizzo: string; anno: string }>();
  for (const d of docs || []) {
    for (const c of d.classe || []) {
      const m = c.match(/^(\d+)º\s+(.+)$/);
      if (m && !/Media/i.test(c)) {
        const anno = m[1];
        const indirizzo = m[2].toLowerCase().replace(/\s+/g, "-");
        set.add({ indirizzo, anno });
      }
    }
  }
  return Array.from(set);
}

export async function generateMetadata({ params }: { params: Promise<{ indirizzo: string; anno: string }> }): Promise<Metadata> {
  const { indirizzo, anno } = await params;
  const label = `${anno}º ${titleCase(indirizzo)}`;
  return {
    title: `${label} — Percorso liceo`,
    description: `Lezioni consigliate per ${label}: matematica e fisica con spiegazioni chiare ed esempi.`,
    alternates: { canonical: `/scuola/liceo/${indirizzo}/${anno}` },
  };
}

export default async function Page({ params }: { params: Promise<{ indirizzo: string; anno: string }> }) {
  const { indirizzo, anno } = await params;
  const label = `${anno}º ${titleCase(indirizzo)}`;
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

