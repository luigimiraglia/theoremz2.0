import MathText from "@/components/MathText";

interface ErrorItem {
  _key: string;
  wrong: string;
  correct: string;
  explanation: string;
}

interface Props {
  items: ErrorItem[];
  heading?: string;
}

function toAnchorId(s: string) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export default function ErroriComuniCards({ items, heading }: Props) {
  const id = heading ? toAnchorId(heading) : undefined;
  return (
    <div className="not-prose my-8 scroll-mt-24" id={id}>
      {heading && (
        <div className="flex items-center gap-3 mb-4">
          <div className="h-7 w-1 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />
          <h2 className="text-2xl font-bold text-amber-600 dark:text-amber-400 leading-tight">
            {heading}
          </h2>
        </div>
      )}
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={item._key ?? i}
          className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          {/* ❌ Wrong */}
          <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/20 px-4 py-3 border-l-4 border-red-500">
            <span className="shrink-0 mt-0.5 text-red-500 font-black text-base leading-none select-none">
              ✗
            </span>
            <p className="font-medium text-red-800 dark:text-red-300 text-sm leading-relaxed">
              <MathText text={item.wrong} />
            </p>
          </div>

          {/* ✅ Correct */}
          <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 border-l-4 border-emerald-500 border-t border-t-slate-100 dark:border-t-slate-800">
            <span className="shrink-0 mt-0.5 text-emerald-500 font-black text-base leading-none select-none">
              ✓
            </span>
            <p className="font-medium text-emerald-800 dark:text-emerald-300 text-sm leading-relaxed">
              <MathText text={item.correct} />
            </p>
          </div>

          {/* Explanation */}
          <div className="bg-slate-50 dark:bg-slate-800/40 px-4 py-3 border-t border-slate-100 dark:border-slate-700/60">
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              <MathText text={item.explanation} />
            </p>
          </div>
        </div>
      ))}
    </div>
    </div>
  );
}
