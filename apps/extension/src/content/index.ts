/**
 * AgentLens Content Script (content/index.ts)
 *
 * Runs directly on the target webpage:
 *  - Provides live hydrated DOM
 *  - Renders visual pulsing neon red overlay for Ghost Elements
 *  - Scrapes DOM entities for 1-click Handoff Fix Bundle
 */

import type { GhostElement } from '@agentlens/schema';

let highlightedElements: HTMLElement[] = [];
let floatingTooltips: HTMLElement[] = [];

// Inject pulsing animation styles
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes agentlensGhostPulse {
    0% { box-shadow: 0 0 0 2px #ef4444, 0 0 10px rgba(239, 68, 68, 0.5); }
    50% { box-shadow: 0 0 0 3px #f87171, 0 0 20px rgba(239, 68, 68, 0.8); }
    100% { box-shadow: 0 0 0 2px #ef4444, 0 0 10px rgba(239, 68, 68, 0.5); }
  }
  .agentlens-ghost-highlight {
    animation: agentlensGhostPulse 1.5s infinite ease-in-out !important;
    position: relative !important;
    outline: 2px dashed #ef4444 !important;
    background: rgba(239, 68, 68, 0.08) !important;
  }
  .agentlens-ghost-badge {
    position: absolute !important;
    top: -24px !important;
    left: 0 !important;
    background: #ef4444 !important;
    color: #ffffff !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
    padding: 2px 6px !important;
    border-radius: 4px !important;
    z-index: 2147483640 !important;
    white-space: nowrap !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
    pointer-events: none !important;
  }
`;
document.head?.appendChild(styleEl);

function clearHighlights() {
  for (const el of highlightedElements) {
    el.classList.remove('agentlens-ghost-highlight');
  }
  for (const tooltip of floatingTooltips) {
    tooltip.remove();
  }
  highlightedElements = [];
  floatingTooltips = [];
}

function highlightGhosts(ghosts: GhostElement[]) {
  clearHighlights();

  for (const ghost of ghosts) {
    try {
      let target: HTMLElement | null = null;
      if (ghost.selector) {
        target = document.querySelector(ghost.selector);
      }

      // If selector fails, search by exact text snippet
      if (!target && ghost.text) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const el = node as HTMLElement;
          if (el.children.length === 0 && el.textContent?.trim() === ghost.text.trim()) {
            target = el;
            break;
          }
        }
      }

      if (target) {
        target.classList.add('agentlens-ghost-highlight');
        highlightedElements.push(target);

        const badge = document.createElement('div');
        badge.className = 'agentlens-ghost-badge';
        badge.textContent = `GHOST: ${ghost.category.toUpperCase()} (${ghost.reason.slice(0, 40)}...)`;
        target.appendChild(badge);
        floatingTooltips.push(badge);
      }
    } catch {
      // Ignore invalid DOM selectors
    }
  }
}

function scrapeLiveFacts() {
  const title = document.title || '';
  const h1 = document.querySelector('h1')?.textContent?.trim() || title;
  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  // Extract prices
  const priceMatches: string[] = [];
  const text = document.body.innerText || '';
  const prices = text.match(/(?:[\$₹€£]\s*\d+(?:\.\d{2})?)/g) || [];
  for (const p of prices) {
    if (!priceMatches.includes(p)) priceMatches.push(p);
  }

  // Detect platform
  let platform = 'Static HTML';
  if (document.getElementById('__NEXT_DATA__') || document.querySelector('script[src*="_next"]')) {
    platform = 'Next.js';
  } else if ((window as unknown as { Shopify?: unknown }).Shopify || document.querySelector('link[href*="cdn.shopify.com"]')) {
    platform = 'Shopify';
  } else if (document.querySelector('meta[name="generator"][content*="WordPress"]') || document.querySelector('link[href*="wp-content"]')) {
    platform = 'WordPress';
  } else if (document.querySelector('astro-island') || document.querySelector('html[data-astro]')) {
    platform = 'Astro';
  }

  return {
    title,
    h1,
    metaDesc,
    prices: priceMatches.slice(0, 5),
    platform,
    url: window.location.href,
  };
}

// Chrome message listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_DOM') {
    sendResponse({
      html: document.documentElement.outerHTML,
      url: window.location.href,
    });
    return true;
  }

  if (message.type === 'HIGHLIGHT_GHOSTS') {
    highlightGhosts(message.ghosts || []);
    sendResponse({ success: true, count: highlightedElements.length });
    return true;
  }

  if (message.type === 'CLEAR_GHOSTS') {
    clearHighlights();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'SCRAPE_PAGE_FACTS') {
    sendResponse(scrapeLiveFacts());
    return true;
  }

  return false;
});
