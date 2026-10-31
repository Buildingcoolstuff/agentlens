# @agentlens/core

> Pure deterministic scoring engine, Dual-DOM hydration differ, RFC 9309 robots parser, and Negative Constraint Schema guard for AgentLens.

[![npm version](https://img.shields.io/npm/v/@agentlens/core.svg?style=flat-square)](https://www.npmjs.com/package/@agentlens/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

## Overview

`@agentlens/core` is a **zero-dependency**, 100% deterministic TypeScript library that runs identically in:
- **Node.js** (CLI and CI pipelines)
- **Cloudflare Workers / Edge Runtime** (serverless scoring)
- **Chrome Extensions / Browser** (in-tab client execution)

No paid LLM APIs. No flaky heuristics. Every score deduction returns an exact `ruleId`, `pillar`, `severity`, `lostPoints`, `evidence`, and `exactFix`.

---

## 7 Scoring Pillars

| Pillar | Weight | Description |
|---|:---:|---|
| **`robots`** | 15% | RFC 9309 compliance; categorizes search bots vs. user-action fetchers vs. training crawlers |
| **`renderParity`** | 25% | Detects Next.js App Router Suspense traps (`id="S:..."`), unhydrated templates, and CSR shells |
| **`quotability`** | 15% | Top-30% direct answer density, fact-to-noise ratio, and bare-pronoun fragmentation detection |
| **`jsonld`** | 15% | Schema.org `@graph` integrity, duplicate/conflicting types, and 100% visible parity check |
| **`entityFreshness`** | 10% | Wikidata Q-ID corroboration in `sameAs` and `dateModified` freshness within 365 days |
| **`negativeBoundaries`** | 10% | Negative Constraint Schema (`ncs:v1`) compliance, non-expired boundaries, and closed-world sets |
| **`continuity`** | 10% | Floating zero-CLS AI continuity bar and W3C WebMCP (`navigator.modelContext`) bridge |

---

## Installation

```bash
npm install @agentlens/core
# or
pnpm add @agentlens/core
```

---

## Programmatic Usage

```typescript
import { auditAndScore, diffDualDOM, auditRobotsForPath } from '@agentlens/core';

const report = auditAndScore({
  targetUrl: 'https://example.com',
  rawHtml: '<html>...</html>',        // Initial SSR response
  hydratedHtml: '<html>...</html>',   // Optional live DOM
  robotsTxt: 'User-agent: *\nAllow: /',
});

console.log(`S_fetch:  ${report.sFetch}/100`);
console.log(`S_render: ${report.sRender}/100`);
console.log(`Blindness Gap: ${report.blindnessGap} pts`);
```

---

## License

MIT © AgentLens Maintainers
