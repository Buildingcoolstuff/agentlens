import React, { useEffect, useState } from 'react';
import { RefreshCw, ExternalLink, ShieldCheck, DownloadCloud } from 'lucide-react';
import { auditAndScore } from '@agentlens/core';
import type { AgentLensReport } from '@agentlens/schema';
import { DualScoreHeader } from '../components/DualScoreHeader.js';
import { GhostOverlayToggle } from '../components/GhostOverlayToggle.js';
import { DiagnosticAccordion } from '../components/DiagnosticAccordion.js';
import { FixBundleModal } from '../components/FixBundleModal.js';

export const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AgentLensReport | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [showFixModal, setShowFixModal] = useState(false);
  const [scrapedData, setScrapedData] = useState<{
    title: string;
    h1: string;
    metaDesc: string;
    prices: string[];
    platform: string;
    url: string;
  } | null>(null);

  const runAudit = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) {
        throw new Error('Unable to access current browser tab.');
      }

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
        throw new Error('AgentLens cannot audit internal browser pages.');
      }

      setCurrentUrl(tab.url);

      // 2. Fetch live hydrated DOM from tab content script
      let hydratedHtml = '';
      try {
        const domRes = await chrome.tabs.sendMessage(tab.id, { type: 'GET_DOM' });
        if (domRes?.html) {
          hydratedHtml = domRes.html;
        }
      } catch {
        // Content script might need to inject
      }

      // 3. Request background script to fetch raw non-rendering SSR HTML & robots.txt
      const rawRes = await chrome.runtime.sendMessage({
        type: 'FETCH_RAW_HTML',
        url: tab.url,
      });

      const rawHtml = rawRes?.success ? rawRes.html : hydratedHtml;

      const urlObj = new URL(tab.url);
      const robotsRes = await chrome.runtime.sendMessage({
        type: 'FETCH_ROBOTS',
        url: `${urlObj.origin}/robots.txt`,
      });

      const robotsTxt = robotsRes?.success ? robotsRes.robotsTxt : null;

      // 4. Run deterministic 7-pillar audit
      const auditResult = auditAndScore({
        targetUrl: tab.url,
        rawHtml,
        hydratedHtml: hydratedHtml || rawHtml,
        robotsTxt,
      });

      setReport(auditResult);

      // 5. Scrape facts for Fix Bundle
      try {
        const scraped = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE_FACTS' });
        if (scraped) {
          setScrapedData(scraped);
        }
      } catch {
        // fallback
        setScrapedData({
          title: tab.title || '',
          h1: tab.title || '',
          metaDesc: '',
          prices: [],
          platform: 'Static HTML',
          url: tab.url,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, []);

  return (
    <div className="p-3.5 pb-6 text-slate-100 min-h-screen">
      {/* Top Navbar */}
      <header className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">AgentLens</h1>
            <span className="text-[10px] text-slate-400">GEO & Agentic Web Engine</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowFixModal(true)}
            disabled={!report || !scrapedData}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition"
            title="Generate Fix Bundle"
          >
            <DownloadCloud className="w-4 h-4" />
          </button>
          <button
            onClick={runAudit}
            className={`p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition ${
              loading ? 'animate-spin' : ''
            }`}
            title="Re-run Audit"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Target URL Pill */}
      {currentUrl && (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-400 mb-3">
          <span className="truncate max-w-[320px]">{currentUrl}</span>
          <a
            href={currentUrl}
            target="_blank"
            rel="noreferrer"
            className="text-slate-500 hover:text-slate-300 ml-2"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Running 7-Pillar Deterministic Scorer...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs my-4 space-y-2">
          <strong>Audit Encountered An Issue</strong>
          <p>{error}</p>
          <button
            onClick={runAudit}
            className="mt-2 px-3 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results View */}
      {report && !loading && (
        <>
          <DualScoreHeader
            sFetch={report.sFetch}
            sRender={report.sRender}
            blindnessGap={report.blindnessGap}
            hardGates={report.hardGatesTriggered}
          />

          <GhostOverlayToggle ghostElements={report.ghostElements} />

          <DiagnosticAccordion pillars={report.pillars} />

          {/* 1-Click Fix Bundle CTA */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <button
              onClick={() => setShowFixModal(true)}
              className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Generate Fix Bundle (1-Click Handoff)</span>
            </button>
          </div>
        </>
      )}

      {/* Fix Bundle Modal */}
      {scrapedData && (
        <FixBundleModal
          isOpen={showFixModal}
          onClose={() => setShowFixModal(false)}
          scrapedData={scrapedData}
        />
      )}
    </div>
  );
};
