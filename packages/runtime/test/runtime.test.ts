// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectExplicitReferrer,
  extractPageFacts,
  mountContinuityBar,
  registerWebMcpBridge,
} from '../src/index.js';

describe('@agentlens/runtime — AI Continuity & Arrival Detection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Reset window.__AGENTLENS_FACTS__
    delete (window as unknown as { __AGENTLENS_FACTS__?: unknown }).__AGENTLENS_FACTS__;
  });

  it('detects AI arrival via explicit query parameters (utm_source)', () => {
    // Mock location
    delete (window as unknown as { location?: unknown }).location;
    window.location = new URL('https://example.com/product?utm_source=chatgpt.com&utm_medium=ai-search') as unknown as Location;

    const res = detectExplicitReferrer();
    expect(res.detected).toBe(true);
    expect(res.source).toBe('chatgpt.com');
  });

  it('extracts facts from window.__AGENTLENS_FACTS__ if present', () => {
    (window as unknown as { __AGENTLENS_FACTS__: unknown }).__AGENTLENS_FACTS__ = {
      entity: { name: 'Garuda Footwear' },
      offerings: [{ name: 'Garuda Velocity X9', price: 249, priceCurrency: '$' }],
      ncs: {
        constraints: [
          { capability: 'waterproof', statement: 'Not waterproof.' },
        ],
      },
    };

    const facts = extractPageFacts();
    expect(facts.title).toBe('Garuda Footwear');
    expect(facts.price).toBe('$249');
    expect(facts.boundaries).toContain('Not Waterproof');
  });

  it('mounts Shadow-DOM floating continuity bar with zero layout shift styles', () => {
    const data = {
      title: 'Garuda Velocity X9',
      price: '$249.00',
      verifiedAsOf: '2026-10-31',
      boundaries: ['Not Waterproof', 'Dry Road Only'],
      jumpChips: [{ label: 'Specs', selectorOrHash: '#specs' }],
    };

    const unmount = mountContinuityBar(data);
    const host = document.getElementById('agentlens-continuity-host');
    expect(host).not.toBeNull();
    // Verify zero layout shift CSS containment
    expect(host?.style.contain).toBe('layout paint');
    expect(host?.style.position).toBe('fixed');
    expect(host?.shadowRoot).not.toBeNull();

    // Verify card content inside shadow root
    const card = host?.shadowRoot?.querySelector('.card');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('Garuda Velocity X9');
    expect(card?.textContent).toContain('$249.00');

    // Test unmount
    unmount();
    expect(document.getElementById('agentlens-continuity-host')).toBeNull();
  });

  it('handles WebMCP navigator.modelContext registration gracefully', () => {
    // Should not throw even if navigator.modelContext is undefined in happy-dom
    const registered = registerWebMcpBridge();
    expect(typeof registered).toBe('boolean');
  });
});
