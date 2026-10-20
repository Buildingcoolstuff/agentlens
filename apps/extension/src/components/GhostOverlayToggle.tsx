import React, { useState } from 'react';
import { Ghost, Sparkles, Check } from 'lucide-react';
import type { GhostElement } from '@agentlens/schema';

interface GhostOverlayToggleProps {
  ghostElements: GhostElement[];
}

export const GhostOverlayToggle: React.FC<GhostOverlayToggleProps> = ({ ghostElements }) => {
  const [isHighlighted, setIsHighlighted] = useState(false);

  const toggleHighlight = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      if (!isHighlighted) {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'HIGHLIGHT_GHOSTS',
          ghosts: ghostElements,
        });
        setIsHighlighted(true);
      } else {
        await chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_GHOSTS' });
        setIsHighlighted(false);
      }
    } catch (err) {
      console.error('Failed to communicate with tab content script:', err);
    }
  };

  const priceGhosts = ghostElements.filter((g) => g.category === 'price');
  const trapGhosts = ghostElements.filter((g) => g.category === 'suspense-trap');

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 my-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Ghost className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-200">
              Hydration Blindspots ({ghostElements.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              {priceGhosts.length > 0 && `${priceGhosts.length} Prices missing in SSR • `}
              {trapGhosts.length > 0 && `${trapGhosts.length} Suspense Traps • `}
              Elements hidden from AI bots
            </p>
          </div>
        </div>

        <button
          onClick={toggleHighlight}
          disabled={ghostElements.length === 0}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
            isHighlighted
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50 hover:bg-rose-500'
              : ghostElements.length > 0
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              : 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-800'
          }`}
        >
          {isHighlighted ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Overlay Active</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Highlight Ghosts</span>
            </>
          )}
        </button>
      </div>

      {isHighlighted && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-800 text-[11px] text-rose-300/90 flex items-center justify-between">
          <span>Pulsing red overlays are now visible on the active webpage tab.</span>
          <button
            onClick={toggleHighlight}
            className="text-xs text-slate-400 underline hover:text-slate-200"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};
