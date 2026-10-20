/**
 * Three-Layer AI Arrival & Intent Detection (detection.ts)
 */

export interface AiArrivalContext {
  isAiArrival: boolean;
  source: string | null;
  detectionLayer: 1 | 2 | 3 | null;
  targetSection: string | null;
  targetHeading: string | null;
}

const AI_DOMAINS = [
  'chatgpt.com',
  'openai.com',
  'perplexity.ai',
  'gemini.google.com',
  'claude.ai',
  'anthropic.com',
  'copilot.microsoft.com',
  'bing.com',
];

/**
 * Layer 1: Explicit Referrer & UTM parameter detection
 */
export function detectExplicitReferrer(): { detected: boolean; source: string | null } {
  if (typeof window === 'undefined') return { detected: false, source: null };

  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source')?.toLowerCase();
    const utmMedium = params.get('utm_medium')?.toLowerCase();

    for (const domain of AI_DOMAINS) {
      if (utmSource?.includes(domain.split('.')[0] || '') || utmMedium === 'ai-search' || utmSource === domain) {
        return { detected: true, source: domain };
      }
    }

    const referrer = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : '';
    for (const domain of AI_DOMAINS) {
      if (referrer.includes(domain)) {
        return { detected: true, source: domain };
      }
    }
  } catch {
    // URL parsing fallback
  }

  return { detected: false, source: null };
}

/**
 * Layer 2: Text Fragment & Scroll-Y Landing Inference
 */
export function detectLandingInference(): {
  detected: boolean;
  targetSection: string | null;
  targetHeading: string | null;
} {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { detected: false, targetSection: null, targetHeading: null };
  }

  // Check Text Fragment (Chrome / Edge / Safari support #:~:text=)
  const hash = window.location.hash;
  const hasTextDirective = hash.includes(':~:text=');
  const hasInitialScroll = window.scrollY > 8 || document.documentElement.scrollTop > 8;

  if (!hasTextDirective && !hasInitialScroll) {
    return { detected: false, targetSection: null, targetHeading: null };
  }

  // Probe element at upper-third viewport line
  const probeX = window.innerWidth / 2;
  const probeY = window.innerHeight * 0.33;
  const el = document.elementFromPoint(probeX, probeY);

  let targetSection: string | null = null;
  let targetHeading: string | null = null;

  if (el) {
    const sectionEl = el.closest('[data-agent-section]');
    if (sectionEl) {
      targetSection = sectionEl.getAttribute('data-agent-section');
    }

    const headingEl = el.closest('h1, h2, h3') || document.querySelector('h1, h2, h3');
    if (headingEl) {
      targetHeading = headingEl.textContent?.trim().slice(0, 60) || null;
    }
  }

  return {
    detected: true,
    targetSection,
    targetHeading,
  };
}

/**
 * Layer 3: User Input Latch (cancels if human already interacted before rAF)
 */
export function createInputLatch(onLatch: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  let latched = false;

  const handleInput = () => {
    if (!latched) {
      latched = true;
      cleanup();
      onLatch();
    }
  };

  const cleanup = () => {
    window.removeEventListener('scroll', handleInput, { capture: true });
    window.removeEventListener('pointerdown', handleInput, { capture: true });
    window.removeEventListener('keydown', handleInput, { capture: true });
    window.removeEventListener('wheel', handleInput, { capture: true });
  };

  window.addEventListener('scroll', handleInput, { capture: true, passive: true });
  window.addEventListener('pointerdown', handleInput, { capture: true, passive: true });
  window.addEventListener('keydown', handleInput, { capture: true, passive: true });
  window.addEventListener('wheel', handleInput, { capture: true, passive: true });

  return cleanup;
}

/**
 * Runs 3-layer arrival detection.
 */
export function analyzeArrival(): AiArrivalContext {
  const l1 = detectExplicitReferrer();
  if (l1.detected) {
    const l2 = detectLandingInference();
    return {
      isAiArrival: true,
      source: l1.source,
      detectionLayer: 1,
      targetSection: l2.targetSection,
      targetHeading: l2.targetHeading,
    };
  }

  const l2 = detectLandingInference();
  if (l2.detected) {
    return {
      isAiArrival: true,
      source: 'text-fragment-or-scroll-target',
      detectionLayer: 2,
      targetSection: l2.targetSection,
      targetHeading: l2.targetHeading,
    };
  }

  return {
    isAiArrival: false,
    source: null,
    detectionLayer: null,
    targetSection: null,
    targetHeading: null,
  };
}
