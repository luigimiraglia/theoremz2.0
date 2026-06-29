import { KaBlock } from "@/components/KaTeX";
import MathText from "@/components/MathText";
import "katex/dist/katex.min.css";

interface PuntoChiave {
  _key: string;
  testo: string;
}

interface Props {
  titolo: string;
  definizione: string;
  formulaPrincipale?: string | null;
  puntiChiave: PuntoChiave[];
}

export default function RiepilogoBox({ titolo, definizione, formulaPrincipale, puntiChiave }: Props) {
  return (
    <div id="concetto-chiave" className="not-prose my-6 scroll-mt-24 rounded-2xl overflow-hidden border border-blue-200 bg-gradient-to-br from-white to-sky-50 shadow-sm ring-1 ring-blue-50 [.dark_&]:border-blue-800/60 [.dark_&]:from-blue-950/30 [.dark_&]:to-sky-950/20 [.dark_&]:ring-0">
      {/* Header */}
      <div className="px-5 pt-3.5 pb-3 bg-blue-50 [.dark_&]:bg-blue-900/30 border-b border-blue-100 [.dark_&]:border-blue-800/40">
        <div className="text-[0.68rem] font-black tracking-widest uppercase text-blue-600 [.dark_&]:text-blue-500 mb-0.5 select-none">
          Concetto chiave
        </div>
        <h2 className="font-bold text-blue-900 [.dark_&]:text-blue-100 text-[1.05rem] leading-snug">
          <MathText text={titolo} />
        </h2>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Definizione */}
        <p className="text-slate-800 [.dark_&]:text-slate-300 leading-relaxed">
          <MathText text={definizione} />
        </p>

        {/* Formula principale */}
        {formulaPrincipale && (
          <div className="rounded-xl bg-white [.dark_&]:bg-slate-900/50 border border-blue-100 [.dark_&]:border-blue-900/40 px-4 py-3 flex justify-center overflow-x-auto shadow-sm [.dark_&]:shadow-none">
            <KaBlock>{formulaPrincipale}</KaBlock>
          </div>
        )}

        {/* Punti chiave */}
        {puntiChiave.length > 0 && (
          <ul className="space-y-2 pt-1">
            {puntiChiave.map((punto, i) => (
              <li key={punto._key ?? i} className="flex items-start gap-2.5">
                <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-blue-500 [.dark_&]:bg-blue-600 flex items-center justify-center text-white text-[9px] font-black leading-none select-none">
                  ✓
                </span>
                <span className="text-slate-800 [.dark_&]:text-slate-300 text-[0.9rem] leading-relaxed">
                  <MathText text={punto.testo} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
