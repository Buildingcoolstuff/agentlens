import { describe, it, expect } from 'vitest';
import {
  parseRobotsTxt,
  checkBotPath,
  auditRobotsForPath,
  diffDualDOM,
  analyzeQuotability,
  auditJsonLd,
  verifyClaimAgainstNcs,
  auditAndScore,
} from '../src/index.js';
import type { NegativeConstraintSchemaV1Type } from '@agentlens/schema';

describe('RFC 9309 robots.txt Parser', () => {
  const robotsTxt = `
User-agent: Googlebot
Disallow: /private/
Allow: /private/public-preview/

User-agent: OAI-SearchBot
Disallow: /admin/
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: *
Disallow: /secret/
Allow: /secret/open$
`;

  const parsed = parseRobotsTxt(robotsTxt);

  it('correctly parses user-agent groups and rules', () => {
    expect(parsed.groups.length).toBeGreaterThanOrEqual(4);
  });

  it('applies longest pattern match and allows tie-breaker per RFC 9309', () => {
    // Googlebot should be allowed on /private/public-preview/ because Allow rule is longer than Disallow: /private/
    const check1 = checkBotPath(parsed, 'Googlebot', '/private/public-preview/item-1');
    expect(check1.allowed).toBe(true);

    const check2 = checkBotPath(parsed, 'Googlebot', '/private/other');
    expect(check2.allowed).toBe(false);
  });

  it('differentiates SearchBot from Training Crawler', () => {
    const audit = auditRobotsForPath(robotsTxt, '/');
    const searchBot = audit.botResults.find((b) => b.botName === 'OAI-SearchBot');
    const trainingBot = audit.botResults.find((b) => b.botName === 'GPTBot');

    expect(searchBot?.allowed).toBe(true);
    expect(searchBot?.category).toBe('search');

    expect(trainingBot?.allowed).toBe(false);
    expect(trainingBot?.category).toBe('training');
    expect(trainingBot?.penalizeOnBlock).toBe(false); // Training bot block does not penalize GEO search score
  });

  it('handles end-of-string pattern matching with $', () => {
    const checkOpen = checkBotPath(parsed, 'otherbot', '/secret/open');
    expect(checkOpen.allowed).toBe(true);

    const checkOpenSub = checkBotPath(parsed, 'otherbot', '/secret/open/extra');
    expect(checkOpenSub.allowed).toBe(false);
  });
});

describe('Dual-DOM Differ & Next.js Streaming Suspense', () => {
  const rawHtml = `
  <!DOCTYPE html>
  <html>
    <body>
      <main>
        <h1>Garuda Velocity X9</h1>
        <p>The premier carbon-plated marathon shoe for elite runners.</p>
        <div hidden id="S:1">
          <span class="price">$249.00</span>
          <span class="specs">Weight: 198g</span>
        </div>
        <template id="B:2">
          <div>Loading sizes...</div>
        </template>
      </main>
    </body>
  </html>
  `;

  const hydratedHtml = `
  <!DOCTYPE html>
  <html>
    <body>
      <main>
        <h1>Garuda Velocity X9</h1>
        <p>The premier carbon-plated marathon shoe for elite runners.</p>
        <div class="pricing-card">
          <span id="product-price" class="price">$249.00</span>
          <span class="specs">Weight: 198g</span>
          <span class="stock">In Stock</span>
        </div>
      </main>
    </body>
  </html>
  `;

  it('detects Next.js streaming suspense traps', () => {
    const diff = diffDualDOM(rawHtml, hydratedHtml);
    expect(diff.hasSuspenseTraps).toBe(true);
    expect(diff.suspenseTrapsCount).toBe(2);
    expect(diff.ghostElements.some((g) => g.category === 'suspense-trap')).toBe(true);
  });

  it('extracts ghost elements present in hydrated DOM but missing from raw SSR', () => {
    const diff = diffDualDOM(rawHtml, hydratedHtml);
    expect(diff.ghostElements.length).toBeGreaterThan(0);
    expect(diff.mainContainerSelector).toBe('main');
  });

  it('detects empty CSR shell', () => {
    const emptyRaw = '<html><body><div id="root"></div></body></html>';
    const bigHydrated = `<html><body><main>${'Content word '.repeat(350)}</main></body></html>`;
    const diff = diffDualDOM(emptyRaw, bigHydrated);
    expect(diff.isEmptyCsrShell).toBe(true);
  });
});

describe('Quotability & Fact-to-Noise Analysis', () => {
  it('detects high marketing puffery noise vs concrete facts', () => {
    const pufferyHtml = `
      <h1>SuperProduct</h1>
      <p>This is a revolutionary, world-class, seamless, game-changing platform with cutting-edge synergy.</p>
    `;
    const analysis = analyzeQuotability(pufferyHtml);
    expect(analysis.noiseUnitsCount).toBeGreaterThan(3);
    expect(analysis.factToNoiseRatio).toBeLessThan(0.5);
  });

  it('recognizes top-30% direct answer and subject-first statements', () => {
    const goodHtml = `
      <h1>Garuda Velocity X9</h1>
      <p>The Garuda Velocity X9 is a carbon-plated marathon road racing shoe engineered for sub-3-hour distance runners, weighing 198g with a 40mm heel stack and priced at $249.</p>
    `;
    const analysis = analyzeQuotability(goodHtml);
    expect(analysis.h1EntityNamedInUpperThird).toBe(true);
    expect(analysis.hasUpperThirdDirectAnswer).toBe(true);
    expect(analysis.top30PercentScore).toBeGreaterThanOrEqual(70);
  });
});

describe('JSON-LD Integrity & Visible Parity', () => {
  it('detects visible parity between JSON-LD and raw HTML', () => {
    const htmlWithParity = `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Garuda Velocity X9",
            "price": "249",
            "priceCurrency": "USD",
            "sameAs": ["https://www.wikidata.org/entity/Q12345678"]
          }
          </script>
        </head>
        <body>
          <h1>Garuda Velocity X9</h1>
          <p>Price: $249 USD</p>
        </body>
      </html>
    `;

    const audit = auditJsonLd(htmlWithParity);
    expect(audit.hasJsonLd).toBe(true);
    expect(audit.hasWikidataAuthority).toBe(true);
    expect(audit.visibleParityScore).toBe(100);
  });

  it('flags missing visible parity when JSON-LD claims unlisted prices', () => {
    const htmlWithoutParity = `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Phantom Shoe",
            "price": "999"
          }
          </script>
        </head>
        <body>
          <h1>Unrelated Page</h1>
        </body>
      </html>
    `;

    const audit = auditJsonLd(htmlWithoutParity);
    expect(audit.parityIssues.length).toBeGreaterThan(0);
    expect(audit.visibleParityScore).toBeLessThan(50);
  });
});

describe('Negative Constraint Schema (NCS) Guard', () => {
  const ncs: NegativeConstraintSchemaV1Type = {
    schemaVersion: 'ncs:v1',
    constraints: [
      {
        id: 'nc-waterproof',
        capability: 'waterproof',
        value: false,
        modality: 'cannot',
        statement: 'No. The Garuda Velocity X9 is not waterproof and is engineered strictly for dry road running.',
        asOf: '2026-01-01',
        reviewBy: '2027-01-01',
        evidence: 'https://garuda.shoes/specs/velocity-x9',
        aliases: ['water resistance', 'submersible', 'gore-tex', 'wet weather'],
      },
    ],
    closedWorld: [
      {
        class: 'Supported Running Surfaces',
        exhaustive: true,
        members: ['Paved Road', 'All-Weather Track'],
        asOf: '2026-01-01',
      },
    ],
  };

  it('contradicts claims asserting forbidden negative capabilities', () => {
    const result = verifyClaimAgainstNcs('Is the shoe waterproof for rainy weather?', ncs);
    expect(result.status).toBe('contradicted');
    expect(result.matchedConstraint?.id).toBe('nc-waterproof');
  });

  it('supports claims correctly stating the negative constraint', () => {
    const result = verifyClaimAgainstNcs('This shoe is not waterproof and should not be used in water.', ncs);
    expect(result.status).toBe('supported');
  });

  it('enforces closed-world boundaries', () => {
    const result = verifyClaimAgainstNcs('Supported running surfaces include mountain trail', ncs);
    expect(result.status).toBe('contradicted');
  });
});

describe('Full 7-Pillar Deterministic Scorer', () => {
  it('runs complete audit and produces scores and deductions', () => {
    const rawHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Garuda Velocity X9",
            "price": "249",
            "sameAs": ["https://www.wikidata.org/entity/Q10000000"]
          }
          </script>
        </head>
        <body>
          <main data-agent-section="main">
            <h1>Garuda Velocity X9</h1>
            <p>The Garuda Velocity X9 is a premier road racing shoe engineered for distance running, weighing 198g at $249.</p>
          </main>
        </body>
      </html>
    `;

    const report = auditAndScore({
      targetUrl: 'https://garuda.shoes/velocity-x9',
      rawHtml,
      hydratedHtml: rawHtml,
      robotsTxt: 'User-agent: *\nAllow: /',
    });

    expect(report.sFetch).toBeGreaterThan(60);
    expect(report.sRender).toBeGreaterThan(60);
    expect(report.pillars.robots.score).toBe(100);
    expect(report.pillars.renderParity.score).toBe(100);
    expect(report.deductions.length).toBeGreaterThanOrEqual(0);
  });

  it('preserves query parameters in robots.txt matching per RFC 9309', () => {
    const robotsTxt = `
User-agent: *
Disallow: /*?variant=
Allow: /
`;
    // URL with query parameter should trigger Disallow
    const reportBlocked = auditAndScore({
      targetUrl: 'https://garuda.shoes/products?variant=123',
      rawHtml: '<main><h1>Products</h1></main>',
      robotsTxt,
    });
    expect(reportBlocked.pillars.robots.deductions.length).toBeGreaterThan(0);

    // URL without query parameter should be Allowed
    const reportAllowed = auditAndScore({
      targetUrl: 'https://garuda.shoes/products',
      rawHtml: '<main><h1>Products</h1></main>',
      robotsTxt,
    });
    expect(reportAllowed.pillars.robots.deductions.length).toBe(0);
  });
});

describe('CSS Selector Escaping (differ.ts)', () => {
  it('generates valid CSS selectors for Tailwind classes and numeric IDs', async () => {
    const { buildCssSelector } = await import('../src/index.js');

    expect(buildCssSelector({ tag: 'span', className: 'w-1/2' })).toBe('span[class~="w-1/2"]');
    expect(buildCssSelector({ tag: 'div', className: 'text-[14px]' })).toBe('div[class~="text-[14px]"]');
    expect(buildCssSelector({ tag: 'button', className: 'p-2.5' })).toBe('button[class~="p-2.5"]');
    expect(buildCssSelector({ tag: 'div', id: '123-product' })).toBe('[id="123-product"]');
    expect(buildCssSelector({ tag: 'section', id: 'pricing' })).toBe('#pricing');
    expect(buildCssSelector({ tag: 'p', className: 'description' })).toBe('p.description');
  });
});
