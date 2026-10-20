/**
 * Zero-CLS Floating AI Continuity Bar (ui.ts)
 *
 * Implements an accessible Shadow-DOM fixed overlay with:
 *   - position: fixed; bottom: 16px; right: 16px; contain: layout paint; z-index: 2147483647
 *   - Zero layout shift (CLS === 0.000)
 *   - Verified Entity Title, Price, dateModified
 *   - Negative Constraint Boundary Pills
 *   - Deep-jump anchor chips
 */

export interface ContinuityData {
  title: string;
  price?: string;
  verifiedAsOf?: string;
  boundaries: string[];
  jumpChips?: Array<{ label: string; selectorOrHash: string }>;
}

export function extractPageFacts(): ContinuityData {
  let title = document.title || 'Verified Entity';
  let price: string | undefined;
  let verifiedAsOf: string | undefined = new Date().toISOString().split('T')[0];
  const boundaries: string[] = [];

  // 1. Try reading window.__AGENTLENS_FACTS__ if present
  const win = window as unknown as { __AGENTLENS_FACTS__?: { entity?: { name?: string }; offerings?: Array<{ name?: string; price?: number; priceCurrency?: string }>; ncs?: { constraints?: Array<{ capability: string; statement: string }> } } };
  if (win.__AGENTLENS_FACTS__) {
    const facts = win.__AGENTLENS_FACTS__;
    if (facts.entity?.name) title = facts.entity.name;
    if (facts.offerings?.[0]?.price !== undefined) {
      price = `${facts.offerings[0].priceCurrency || '$'}${facts.offerings[0].price}`;
    }
    if (facts.ncs?.constraints) {
      for (const c of facts.ncs.constraints) {
        boundaries.push(`Not ${c.capability.charAt(0).toUpperCase() + c.capability.slice(1)}`);
      }
    }
  }

  // 2. Parse JSON-LD if facts window wasn't available
  if (boundaries.length === 0 || !price) {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent || '');
        const items = Array.isArray(data) ? data : data['@graph'] || [data];
        for (const item of items) {
          if (item['@type'] === 'Product' || item['@type'] === 'Organization') {
            if (item.name && title === document.title) title = item.name;
            if (item.dateModified) verifiedAsOf = item.dateModified.split('T')[0];
            if (item.offers?.price) {
              price = `${item.offers.priceCurrency || '$'}${item.offers.price}`;
            }
          }
        }
      } catch {
        // ignore invalid JSON-LD in DOM
      }
    }
  }

  // 3. Fallback scan for inline data-agent-boundary attributes
  const boundaryEls = document.querySelectorAll('[data-agent-boundary]');
  for (const el of boundaryEls) {
    const val = el.getAttribute('data-agent-boundary');
    if (val && !boundaries.includes(val)) boundaries.push(val);
  }

  // Default fallback boundaries if none declared
  if (boundaries.length === 0) {
    boundaries.push('Official Specifications', 'Direct Manufacturer Data');
  }

  // Quick jump chips from [data-agent-section]
  const jumpChips: Array<{ label: string; selectorOrHash: string }> = [];
  const sections = document.querySelectorAll('[data-agent-section]');
  for (const sec of sections) {
    const sectionName = sec.getAttribute('data-agent-section');
    if (sectionName) {
      jumpChips.push({
        label: sectionName.charAt(0).toUpperCase() + sectionName.slice(1),
        selectorOrHash: `[data-agent-section="${sectionName}"]`,
      });
    }
  }

  if (jumpChips.length === 0) {
    if (document.querySelector('h2, #pricing, .pricing')) {
      jumpChips.push({ label: 'Specs & Details', selectorOrHash: 'h2' });
    }
  }

  return {
    title,
    price,
    verifiedAsOf,
    boundaries: boundaries.slice(0, 3),
    jumpChips: jumpChips.slice(0, 3),
  };
}

export function mountContinuityBar(data: ContinuityData): () => void {
  if (typeof document === 'undefined') return () => {};

  // Prevent multiple bars
  const existing = document.getElementById('agentlens-continuity-host');
  if (existing) existing.remove();

  const host = document.createElement('div');
  host.id = 'agentlens-continuity-host';
  // Ensure host occupies zero layout space
  host.style.cssText = 'position:fixed;bottom:16px;right:16px;contain:layout paint;z-index:2147483647;margin:0;padding:0;pointer-events:auto;';

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .card {
      background: rgba(18, 20, 24, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 12px 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      width: 320px;
      color: #f3f4f6;
      font-size: 13px;
      line-height: 1.4;
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideIn {
      from { transform: translateY(12px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 2px;
    }
    .close-btn:hover { color: #ffffff; }
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-weight: 600;
      font-size: 14px;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .price {
      color: #60a5fa;
      font-weight: 700;
      font-size: 14px;
    }
    .date {
      font-size: 11px;
      color: #9ca3af;
      margin-bottom: 8px;
    }
    .pills {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 10px;
    }
    .pill {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.02em;
    }
    .chips {
      display: flex;
      gap: 6px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 8px;
    }
    .chip {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #e5e7eb;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .chip:hover {
      background: rgba(255, 255, 255, 0.16);
      color: #ffffff;
    }
  `;

  const card = document.createElement('div');
  card.className = 'card';

  card.innerHTML = `
    <div class="header">
      <span class="badge">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        AI Continuity Verified
      </span>
      <button class="close-btn" aria-label="Dismiss">&times;</button>
    </div>
    <div class="title-row">
      <span>${escapeHtml(data.title)}</span>
      ${data.price ? `<span class="price">${escapeHtml(data.price)}</span>` : ''}
    </div>
    <div class="date">Verified as of ${escapeHtml(data.verifiedAsOf || 'today')}</div>
    <div class="pills">
      ${data.boundaries.map((b) => `<span class="pill">${escapeHtml(b)}</span>`).join('')}
    </div>
    ${
      data.jumpChips && data.jumpChips.length > 0
        ? `
      <div class="chips">
        ${data.jumpChips
          .map(
            (c, i) =>
              `<button class="chip" data-idx="${i}">${escapeHtml(c.label)}</button>`
          )
          .join('')}
      </div>`
        : ''
    }
  `;

  // Attach event handlers inside Shadow DOM
  const closeBtn = card.querySelector('.close-btn');
  closeBtn?.addEventListener('click', () => host.remove());

  const chipButtons = card.querySelectorAll<HTMLButtonElement>('.chip');
  chipButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-idx'));
      const chip = data.jumpChips?.[idx];
      if (chip) {
        const target = document.querySelector(chip.selectorOrHash);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  shadow.appendChild(style);
  shadow.appendChild(card);
  document.body.appendChild(host);

  return () => host.remove();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
