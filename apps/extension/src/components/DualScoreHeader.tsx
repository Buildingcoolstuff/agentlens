import React from 'react';
import { Eye, Bot, AlertTriangle } from 'lucide-react';

interface DualScoreHeaderProps {
  sFetch: number;
  sRender: number;
  blindnessGap: number;
  hardGates: string[];
}

export const DualScoreHeader: React.FC<DualScoreHeaderProps> = ({
  sFetch,
  sRender,
  blindnessGap,
  hardGates,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Agentic Readiness Score
        </h2>
        {blindnessGap > 15 ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 border border-rose-500/30 text-rose-300 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            Blindness Gap: {blindnessGap} pts
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            Parity Aligned ({blindnessGap} pts gap)
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* S_fetch: Bot View */}
        <div className={`p-3 rounded-lg border flex flex-col items-center justify-center ${getScoreColor(sFetch)}`}>
          <div className="flex items-center gap-1.5 text-xs font-medium opacity-90 mb-1">
            <Bot className="w-4 h-4" />
            <span>S_fetch (Bot View)</span>
          </div>
          <div className="text-3xl font-extrabold tracking-tight">
            {sFetch}
            <span className="text-xs font-normal opacity-70 ml-0.5">/100</span>
          </div>
          <span className="text-[10px] opacity-75 mt-0.5 text-center">
            What AI Search Bots See
          </span>
        </div>

        {/* S_render: Human View */}
        <div className="p-3 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 text-xs font-medium opacity-90 mb-1">
            <Eye className="w-4 h-4" />
            <span>S_render (Human View)</span>
          </div>
          <div className="text-3xl font-extrabold tracking-tight">
            {sRender}
            <span className="text-xs font-normal opacity-70 ml-0.5">/100</span>
          </div>
          <span className="text-[10px] opacity-75 mt-0.5 text-center">
            Full Hydrated Browser DOM
          </span>
        </div>
      </div>

      {hardGates.length > 0 && (
        <div className="mt-3 p-2 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Hard gate active: <strong>{hardGates.join(', ')}</strong></span>
        </div>
      )}
    </div>
  );
};
