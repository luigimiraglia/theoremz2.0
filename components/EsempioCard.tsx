import { PortableText } from "@portabletext/react";
import { innerPtComponents } from "@/lib/innerPtComponents";
import MathText from "@/components/MathText";

interface Props {
  title: string;
  content: any[];
}

function isNonEmptyTextBlock(b: any) {
  return b._type === "block" && (b.children ?? []).some((c: any) => c.text?.trim());
}

export default function EsempioCard({ title, content }: Props) {
  const blocks = content ?? [];
  const consegnaIdx = blocks.findIndex(isNonEmptyTextBlock);
  const consegna = consegnaIdx >= 0 ? blocks[consegnaIdx] : null;
  const rest = consegnaIdx >= 0
    ? [...blocks.slice(0, consegnaIdx), ...blocks.slice(consegnaIdx + 1)]
    : blocks;

  return (
    <div className="not-prose my-4 rounded-xl overflow-hidden border border-sky-200 bg-white shadow-sm ring-1 ring-sky-50 [.dark_&]:border-sky-800/50 [.dark_&]:bg-sky-950/20 [.dark_&]:ring-0">
      <div className="flex items-center gap-3 px-5 py-3 bg-sky-50 [.dark_&]:bg-sky-900/30 border-b border-sky-100 [.dark_&]:border-sky-800/40">
        <div className="shrink-0 h-5 w-1 rounded-full bg-gradient-to-b from-sky-400 to-indigo-500" />
        <h3 className="font-semibold text-sky-800 [.dark_&]:text-sky-200 text-[0.95rem] leading-snug">
          <MathText text={title} />
        </h3>
      </div>
      <div className="px-5 py-4 text-slate-800 [.dark_&]:text-slate-300">
        {consegna && (
          <div className="flex items-stretch gap-3 mb-1">
            <div className="shrink-0 w-[3px] rounded-full bg-gradient-to-b from-sky-400 to-indigo-500" />
            <div className="flex-1 italic text-slate-600 [.dark_&]:text-slate-400">
              <PortableText value={[consegna]} components={innerPtComponents} />
            </div>
          </div>
        )}
        {rest.length > 0 && (
          <PortableText value={rest} components={innerPtComponents} />
        )}
      </div>
    </div>
  );
}
