import MathText from "@/components/MathText";

interface Riga {
  _key: string;
  cells: string[];
}

interface Props {
  caption?: string | null;
  headers: string[];
  rows: Riga[];
}

function toAnchorId(s: string) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export default function SchemaRapido({ caption, headers, rows }: Props) {
  return (
    <div id={toAnchorId(caption ?? "schema-rapido")} className="not-prose my-6 scroll-mt-24">
      {caption && (
        <div className="flex items-center gap-3 mb-3">
          <div className="h-7 w-1 rounded-full bg-violet-500 dark:bg-violet-400 shrink-0" />
          <h2 className="text-xl font-bold text-violet-700 dark:text-violet-400 leading-tight">
            <MathText text={caption} />
          </h2>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <table className="w-full border-collapse text-sm min-w-[340px]">
          <thead>
            <tr className="bg-slate-800 dark:bg-slate-700">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-2.5 text-left text-white font-semibold whitespace-nowrap text-[0.82rem] tracking-wide"
                >
                  <MathText text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={row._key ?? ri}
                className={ri % 2 === 0 ? "bg-white dark:bg-slate-900/30" : "bg-slate-50 dark:bg-slate-800/30"}
              >
                {(row.cells ?? []).map((cell, ci) => (
                  <td
                    key={ci}
                    className={[
                      "px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 align-top",
                      ci === 0
                        ? "font-semibold text-slate-800 dark:text-slate-200"
                        : "text-slate-600 dark:text-slate-400",
                    ].join(" ")}
                  >
                    <MathText text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
