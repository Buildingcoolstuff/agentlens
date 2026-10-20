import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle, Wrench } from 'lucide-react';
import type { PillarName, PillarScoreBreakdown } from '@agentlens/schema';

interface DiagnosticAccordionProps {
  pillars: Record<PillarName, PillarScoreBreakdown>;
}

const PILLAR_METADATA: Record<PillarName, { title: string; subtitle: string }> = {
  robots: {
    title: '1. Robots Access',
    subtitle: 'RFC 9309 compliance & AI bot permissions',
  },
  renderParity: {
    title: '2. Render Parity',
    subtitle: 'Dual-DOM recall & streaming suspense traps',
  },
  quotability: {
    title: '3. Quotability & Fact Density',
    subtitle: 'Upper 30% direct answer & puffery ratio',
  },
  jsonld: {
    title: '4. JSON-LD Graph Integrity',
    subtitle: 'Schema graph & visible markup parity',
  },
  entityFreshness: {
    title: '5. Entity Freshness & Authority',
    subtitle: 'Wikidata Q-ID corroboration & date freshness',
  },
  negativeBoundaries: {
    title: '6. Negative Boundaries (NCS)',
    subtitle: 'Negative constraint schema & closed worlds',
  },
  continuity: {
    title: '7. Continuity & WebMCP',
    subtitle: 'Zero-CLS AI overlay & modelContext registration',
  },
};

export const DiagnosticAccordion: React.FC<DiagnosticAccordionProps> = ({ pillars }) => {
  const [openPillar, setOpenPillar] = useState<PillarName | null>('renderParity');

  const toggle = (p: PillarName) => {
    setOpenPillar(openPillar === p ? null : p);
  };

  return (
    <div className="space-y-2 my-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
        7-Pillar Diagnostic Breakdown
      </h3>

      {(Object.keys(pillars) as PillarName[]).map((key) => {
        const pillar = pillars[key];
        const meta = PILLAR_METADATA[key];
        const isOpen = openPillar === key;

        const hasIssues = pillar.deductions.length > 0;
        const scoreColor =
          pillar.score >= 80 ? 'text-emerald-400' :
          pillar.score >= 60 ? 'text-amber-400' : 'text-rose-400';

        return (
          <div
            key={key}
            className="border border-slate-800 rounded-lg bg-slate-900/40 overflow-hidden transition"
          >
            <button
              onClick={() => toggle(key)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/40"
            >
              <div className="flex items-center gap-2.5">
                {hasIssues ? (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-medium text-slate-200">{meta.title}</div>
                  <div className="text-[10px] text-slate-400">{meta.subtitle}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${scoreColor}`}>
                  {pillar.score}/100
                </span>
                {isOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="p-3 bg-slate-950/70 border-t border-slate-800/80 text-xs space-y-3">
                {/* Passed checks */}
                {pillar.passedChecks.length > 0 && (
                  <div className="space-y-1">
                    {pillar.passedChecks.map((check, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-emerald-400/90 text-[11px]">
                        <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{check}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Deductions and Fixes */}
                {pillar.deductions.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-200">
                      <span>{d.title}</span>
                      <span className="text-rose-400">-{d.lostPoints} pts</span>
                    </div>

                    <div className="text-slate-400">
                      <strong className="text-slate-300">Evidence:</strong> {d.evidence}
                    </div>

                    <div className="p-1.5 rounded bg-emerald-950/30 border border-emerald-900/40 text-emerald-300 flex items-start gap-1.5">
                      <Wrench className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />
                      <div>
                        <strong>Exact Fix:</strong> {d.exactFix}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
