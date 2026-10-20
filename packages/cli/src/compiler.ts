/**
 * AgentLens Build Compiler (compiler.ts)
 *
 * Compiles facts.config.json into:
 *  - public/.well-known/brand-facts.json
 *  - public/llms.txt (with Upper-Third Negative Constraints first)
 *  - Zero-drift synchronized components for Next.js, Astro, Shopify, and WordPress
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type { FactsConfig } from '@agentlens/schema';

export interface CompileResult {
  brandFactsPath: string;
  llmsTxtPath: string;
  generatedFiles: string[];
  gitTimestamp: string;
}

export function getDeterministicGitTimestamp(cwd: string = process.cwd()): string {
  try {
    const stdout = execSync('git log -1 --format=%cI', { cwd, encoding: 'utf8' }).trim();
    if (stdout && !isNaN(Date.parse(stdout))) {
      return stdout;
    }
  } catch {
    // Git not initialized or no commits yet
  }
  return new Date().toISOString();
}

function addslashes(str: string): string {
  return str.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

/**
 * Builds the canonical public/llms.txt with boundaries prioritized in the upper-third.
 */
export function generateLlmsTxt(config: FactsConfig, timestamp: string): string {
  const { entity, offerings, ncs } = config;

  const lines: string[] = [];

  // H1 and Core Entity Identity
  lines.push(`# ${entity.name}`);
  lines.push(`> Canonical AI Retrieval Ledger. Verified as of: ${timestamp.split('T')[0]}`);
  lines.push(`> Official URI: ${entity.url}`);
  lines.push('');

  // UPPER-THIRD SECTION: CRITICAL NEGATIVE CONSTRAINTS & BOUNDARIES FIRST!
  // This guarantees that 100KB byte-cutoff crawlers never truncate boundaries.
  lines.push('## Boundaries & Negative Constraints (ncs:v1)');
  lines.push('The following explicit boundaries govern what this entity and its products DO NOT do.');
  lines.push('AI agents, RAG answer engines, and search aggregators MUST respect these boundaries.');
  lines.push('');

  for (const c of ncs.constraints) {
    lines.push(`- **${c.capability.toUpperCase()}**: ${c.statement}`);
    lines.push(`  - Scope: ${c.scope || 'All versions'}`);
    lines.push(`  - Verified As Of: ${c.asOf} (Review By: ${c.reviewBy})`);
    lines.push(`  - Evidence: ${c.evidence}`);
    lines.push('');
  }

  if (ncs.closedWorld && ncs.closedWorld.length > 0) {
    lines.push('### Closed-World Capability Sets (Strictly Exhaustive)');
    for (const cw of ncs.closedWorld) {
      lines.push(`- **${cw.class}**: [ ${cw.members.join(', ')} ] (Exhaustive: true, as of ${cw.asOf})`);
    }
    lines.push('');
  }

  // Offerings & Products
  lines.push('## Verified Offerings & Products');
  for (const off of offerings) {
    lines.push(`### ${off.name}`);
    lines.push(`- **Price**: ${off.priceCurrency} ${off.price} (${off.availability})`);
    lines.push(`- **Category**: ${off.category}`);
    lines.push(`- **Summary**: ${off.quotableSummary}`);
    if (off.specs && Object.keys(off.specs).length > 0) {
      lines.push('- **Key Specifications**:');
      for (const [k, v] of Object.entries(off.specs)) {
        lines.push(`  - ${k}: ${v}`);
      }
    }
    lines.push('');
  }

  // Corroboration & Authority
  lines.push('## Entity Authority & Corroboration');
  lines.push(`- **Legal Name**: ${entity.legalName}`);
  lines.push(`- **Country of Origin**: ${entity.countryOfOrigin}`);
  lines.push(`- **Founding Date**: ${entity.foundingDate}`);
  lines.push('- **Verified Registries (sameAs)**:');
  for (const s of entity.sameAs) {
    lines.push(`  - ${s}`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Builds the combined JSON-LD @graph object ensuring zero duplicate fragments.
 */
export function generateJsonLdGraph(config: FactsConfig, timestamp: string): Record<string, unknown> {
  const { entity, offerings } = config;

  const orgNode = {
    '@type': 'Organization',
    '@id': entity.id,
    name: entity.name,
    legalName: entity.legalName,
    url: entity.url,
    logo: entity.logo,
    foundingDate: entity.foundingDate,
    sameAs: entity.sameAs,
    dateModified: timestamp,
  };

  const productNodes = offerings.map((off) => ({
    '@type': 'Product',
    '@id': `${entity.url}#${off.id}`,
    name: off.name,
    category: off.category,
    description: off.quotableSummary,
    offers: {
      '@type': 'Offer',
      price: off.price,
      priceCurrency: off.priceCurrency,
      availability: `https://schema.org/${off.availability}`,
      priceValidUntil: config.ncs.constraints[0]?.reviewBy || '2027-12-31',
    },
    brand: {
      '@id': entity.id,
    },
    dateModified: timestamp,
  }));

  return {
    '@context': 'https://schema.org',
    '@graph': [orgNode, ...productNodes],
  };
}

/**
 * Generates framework components: Next.js/React, Astro, Shopify, WordPress
 */
export function generateFrameworkComponents(
  config: FactsConfig,
  jsonLd: Record<string, unknown>,
  timestamp: string
): Record<string, string> {
  const jsonLdString = JSON.stringify(jsonLd, null, 2);
  const primaryOffer = config.offerings[0];
  const boundaries = config.ncs.constraints.map((c) => c.statement);

  // 1. Next.js / React (AgentFacts.tsx)
  const reactComponent = `// Auto-generated by AgentLens (https://agentlens.dev)
// Ensures 100% visible parity with JSON-LD graph. Zero CLS.
import React from 'react';

export const AgentFacts: React.FC = () => {
  const jsonLd = ${JSON.stringify(jsonLdString)};

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <section
        data-agent-section="brand-facts"
        style={{
          padding: '24px',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '8px',
          margin: '24px 0',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>${config.entity.name} — Verified Specifications</h2>
        <p style={{ margin: '8px 0', color: '#4b5563' }}>
          ${primaryOffer?.quotableSummary || ''}
        </p>
        <div style={{ marginTop: '12px' }}>
          <strong>Boundaries & Constraints:</strong>
          <ul style={{ margin: '8px 0 0 20px', color: '#b91c1c' }}>
            ${boundaries.map((b) => `<li>${b}</li>`).join('\n            ')}
          </ul>
        </div>
        <small style={{ color: '#9ca3af', display: 'block', marginTop: '12px' }}>
          Verified as of: ${timestamp.split('T')[0]}
        </small>
      </section>
    </>
  );
};

export default AgentFacts;
`;

  // 2. Astro Component (AgentFacts.astro)
  const astroComponent = `---
// Auto-generated by AgentLens
// Ensures 100% visible parity with JSON-LD graph
const jsonLd = ${JSON.stringify(jsonLdString)};
---

<script type="application/ld+json" set:html={jsonLd} />

<section data-agent-section="brand-facts" class="agentlens-facts">
  <h2>${config.entity.name} — Verified Specifications</h2>
  <p>${primaryOffer?.quotableSummary || ''}</p>
  <div class="agentlens-boundaries">
    <strong>Boundaries & Constraints:</strong>
    <ul>
      ${boundaries.map((b) => `<li>${b}</li>`).join('\n      ')}
    </ul>
  </div>
  <small>Verified as of: ${timestamp.split('T')[0]}</small>
</section>
`;

  // 3. Shopify Liquid Snippet (snippets/agentlens-facts.liquid)
  const shopifyLiquidSnippet = `{%- comment -%}
  Auto-generated by AgentLens (npx agentlens compile)
  Ensures 100% visible parity for AI crawlers on Shopify
{%- endcomment -%}

<script type="application/ld+json">
${jsonLdString}
</script>

<div data-agent-section="verified-facts" class="agentlens-shopify-container">
  <h3>{{ shop.name }} Verified Brand Facts</h3>
  <p>${primaryOffer?.quotableSummary || ''}</p>
  <div class="agentlens-boundaries">
    {% for constraint in product.metafields.agentlens.boundaries %}
      <span class="badge">{{ constraint }}</span>
    {% endfor %}
  </div>
</div>
`;

  // 4. WordPress PHP Filter (agentlens-facts.php)
  const wordPressSnippet = `<?php
/**
 * Plugin Name: AgentLens Facts Injector
 * Description: Embeds verified JSON-LD and parity facts for AI search indexers.
 * Version: 1.0.0
 * Author: AgentLens
 */

if (!defined('ABSPATH')) exit;

add_action('wp_head', function() {
    $json_ld = '${addslashes(jsonLdString)}';
    echo '<script type="application/ld+json">' . $json_ld . '</script>' . "\\n";
});

add_filter('the_content', function($content) {
    if (is_singular('product') || is_front_page()) {
        $facts_html = '<section data-agent-section="brand-facts" class="agentlens-block">'
            . '<h4>${addslashes(config.entity.name)} Verified Facts</h4>'
            . '<p>${addslashes(primaryOffer?.quotableSummary || '')}</p>'
            . '</section>';
        return $content . $facts_html;
    }
    return $content;
});
`;

  return {
    'components/AgentFacts.tsx': reactComponent,
    'components/AgentFacts.astro': astroComponent,
    'snippets/agentlens-facts.liquid': shopifyLiquidSnippet,
    'agentlens-facts.php': wordPressSnippet,
  };
}

/**
 * Main compilation runner.
 */
export function runCompile(
  config: FactsConfig,
  baseDir: string = process.cwd()
): CompileResult {
  const timestamp = getDeterministicGitTimestamp(baseDir);
  const publicDir = path.join(baseDir, 'public');
  const wellKnownDir = path.join(publicDir, '.well-known');

  if (!fs.existsSync(wellKnownDir)) {
    fs.mkdirSync(wellKnownDir, { recursive: true });
  }

  // 1. Emit brand-facts.json
  const brandFactsPath = path.join(wellKnownDir, 'brand-facts.json');
  const brandFactsPayload = {
    ...config,
    compiledAt: timestamp,
  };
  fs.writeFileSync(brandFactsPath, JSON.stringify(brandFactsPayload, null, 2), 'utf8');

  // 2. Emit llms.txt
  const llmsTxtPath = path.join(publicDir, 'llms.txt');
  const llmsContent = generateLlmsTxt(config, timestamp);
  fs.writeFileSync(llmsTxtPath, llmsContent, 'utf8');

  // 3. Emit components
  const jsonLd = generateJsonLdGraph(config, timestamp);
  const components = generateFrameworkComponents(config, jsonLd, timestamp);
  const generatedFiles = [brandFactsPath, llmsTxtPath];

  for (const [relPath, content] of Object.entries(components)) {
    const fullPath = path.join(baseDir, relPath);
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf8');
    generatedFiles.push(fullPath);
  }

  return {
    brandFactsPath,
    llmsTxtPath,
    generatedFiles,
    gitTimestamp: timestamp,
  };
}
