export * from './detection.js';
export * from './ui.js';
export * from './webmcp.js';

import { analyzeArrival, createInputLatch } from './detection.js';
import { extractPageFacts, mountContinuityBar } from './ui.js';
import { registerWebMcpBridge } from './webmcp.js';

/**
 * Initializes the full AgentLens Runtime:
 *  1. Registers W3C WebMCP tools if browser supports navigator.modelContext
 *  2. Evaluates 3-layer AI arrival detection
 *  3. Mounts the zero-CLS Continuity Bar if AI intent is detected
 */
export function initAgentLensRuntime(): () => void {
  if (typeof window === 'undefined') return () => {};

  registerWebMcpBridge();

  const arrival = analyzeArrival();
  if (!arrival.isAiArrival) {
    return () => {};
  }

  let cleanupBar: (() => void) | null = null;

  const cancelLatch = createInputLatch(() => {
    // Human is actively interacting
  });

  const onReady = () => {
    const facts = extractPageFacts();
    cleanupBar = mountContinuityBar(facts);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    requestAnimationFrame(onReady);
  }

  return () => {
    cancelLatch();
    if (cleanupBar) cleanupBar();
  };
}
