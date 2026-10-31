# AgentLens (`agentlens`)

> **The Open-Source Generative Engine Optimization (GEO) & Agentic Web Engine — Audit in the Browser, Compile in the Build, Orient at the Edge.**

<div align="center">

[![CI](https://github.com/Buildingcoolstuff/agentlens/actions/workflows/ci.yml/badge.svg)](https://github.com/Buildingcoolstuff/agentlens/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Turborepo](https://img.shields.io/badge/monorepo-Turborepo-blue)](https://turbo.build/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-5.7%20Strict-3178c6.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-12.x-orange.svg)](https://pnpm.io/)
[![Unit Tests](https://img.shields.io/badge/tests-36%20passed-brightgreen.svg)](https://github.com/Buildingcoolstuff/agentlens/actions)
[![MCP Server](https://img.shields.io/badge/MCP-1.6.1-purple.svg)](https://modelcontextprotocol.io)

[Features](#-the-generative-engine-optimization-geo-problem) •
[Architecture](#-monorepo-architecture) •
[7 Deterministic Pillars](#-the-7-deterministic-pillars) •
[Quick Start](#-quick-start) •
[Comparison Matrix](#-why-agentlens-vs-alternatives) •
[MCP Server](#-ide-model-context-protocol-mcp-server) •
[Contributing](#-contributing)

</div>

---

## ⚡ The Generative Engine Optimization (GEO) Problem

Modern web applications are built for human rendering engines (V8, WebKit) that execute megabytes of JavaScript, unwrap streaming suspense tags, and fetch pricing via client-side GraphQL.

However, **AI Search Crawlers** (such as `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, and `Googlebot` AI Overviews) **do NOT render JavaScript**. They fetch raw HTML. When an AI crawler indexes your site:
1. **Hydration Blindspots**: Dynamic pricing, sizing, stock levels, and specs hidden in client JS or Next.js streaming `<div hidden id="S:...">` tags are completely lost.
2. **Hallucination Cascades**: When retrieval engines find ambiguous or missing boundaries, LLMs invent answers (hallucinating waterproof claims, unverified warranties, or incompatible operating systems).
3. **Fragmented Pronouns**: Content starting with "It features...", "They provide..." gets split into isolated RAG chunks where entity context is severed.

**AgentLens solves this with 100% deterministic, zero-cost, local tooling.**

```text
[ Browser / DevTools ]           [ Build / CI Engine ]            [ Edge & Runtime ]
   Chrome MV3 Extension            npx agentlens audit / compile    @agentlens/runtime
   Pulsing Ghost Overlay  ───────▶ SARIF GitHub Code Scanning ───▶ Zero-CLS Continuity Bar
   1-Click Fix Bundle              Deterministic 7-Pillars          W3C WebMCP Bridge
```

---

## ⚖ Why AgentLens? (vs. Alternatives)

| Feature | Traditional SEO (Lighthouse / Ahrefs) | LLM-as-a-Judge API Tools | **AgentLens** |
|:---|:---:|:---:|:---:|
| **Cost** | Free to \$99+/mo | \$0.03 – \$0.15 per page | **100% Free & Open Source ($0.00)** |
| **Execution Environment** | Local / Cloud | Requires paid OpenAI/Anthropic API | **Runs 100% locally in Browser, Node, CI, Edge** |
| **Deterministic Output** | Mixed | ❌ Non-deterministic (LLM drift) | **✅ 100% Identical outputs for identical inputs** |
| **Next.js Suspense Traps** | ❌ Ignored | ❌ Misses streaming chunks | **✅ Detects `<div hidden id="S:...">` & `<template>`** |
| **Negative Boundaries (NCS)**| ❌ None | ❌ Untracked | **✅ Enforces `ncs:v1` boundaries & review dates** |
| **IDE MCP Integration** | ❌ None | ❌ Rare | **✅ Built-in stdio MCP server for Cursor/Claude** |
| **AI Continuity Bar** | ❌ None | ❌ None | **✅ < 5 KB Zero-CLS floating widget** |
| **WebMCP Browser Tools** | ❌ None | ❌ None | **✅ `navigator.modelContext` bridge** |

---

## 🏗 Monorepo Architecture

AgentLens is built as an MIT-licensed TypeScript monorepo using **Turborepo** and **pnpm workspaces**:

```text
agentlens/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── packages/
│   ├── schema/        # @agentlens/schema - Zod schemas & types for facts.config.json, NCS v1, and Reports
│   ├── core/          # @agentlens/core - Pure deterministic scoring, DOM diffing, RFC 9309 robots parser, NCS guard
│   ├── runtime/       # @agentlens/runtime - < 5KB Zero-CLS AI Continuity Bar & WebMCP bridge
│   ├── cli/           # agentlens - CLI compiler (`npx agentlens init | audit | compile | sarif`) + Wikidata resolver
│   └── mcp/           # @agentlens/mcp - Local stdio Model Context Protocol server for Cursor, Windsurf, Claude Code
├── apps/
│   └── extension/     # Chrome MV3 Extension (Popup + DevTools Panel + Visual Hydration Blindspot Overlay)
└── examples/
    └── garuda-storefront/ # Testbed site with intentional CSR traps, streaming fallbacks, and puffery
```

---

## 🔬 The 7 Deterministic Pillars

AgentLens computes two reproducible headline scores:
- **$S_{\text{fetch}}$ (Bot View)**: What non-rendering AI crawlers see (0–100).
- **$S_{\text{render}}$ (Human View)**: What full JS-rendering browsers see (0–100).
- **$\text{Blindness Gap} = S_{\text{render}} - S_{\text{fetch}}$**.

| Pillar | Focus | Key Checks | Weight |
|---|---|---|:---:|
| **1. Robots Access** | RFC 9309 Compliance | Evaluates `OAI-SearchBot`, `PerplexityBot`, `Claude-SearchBot`. User-action fetchers advisory; training crawlers badge-only. | 15% |
| **2. Render Parity** | Dual-DOM Hydration | Next.js streaming suspense traps (`<div hidden id="S:...">`), 3-gram Shingle Jaccard, numeric token recall, Ghost Elements. | 25% |
| **3. Quotability & Noise** | Fact vs. Puffery | First-30% direct answer density, fact verbs vs. marketing puffery buzzwords, bare-pronoun RAG fragmentation. | 15% |
| **4. JSON-LD Graph** | Structured Data Integrity | Duplicate/conflicting `@type: Product` blocks (Shopify trap), `@id` cross-references, visible HTML markup parity. | 15% |
| **5. Entity Freshness** | Authority Corroboration | Wikidata Q-ID verification via `sameAs`, `dateModified` freshness (< 365 days). | 10% |
| **6. Negative Boundaries** | Boundary Protection | Negative Constraint Schema (`ncs:v1`), explicit `value: false` declarations, closed-world sets, `reviewBy` expiry. | 10% |
| **7. Continuity & WebMCP** | Agent Interoperability | Zero-CLS overlay, W3C WebMCP (`navigator.modelContext`) tool auto-registration, `[data-agent-section]` anchors. | 10% |

---

## 🚀 Quick Start

### 1. Initialize Brand Facts
Auto-discover your brand's authoritative Wikidata Q-ID and scaffold `facts.config.json`:
```bash
npx agentlens init https://yourwebsite.com
```

### 2. Compile Synchronized Artifacts
Compile your single source of truth into machine ledgers and synchronized framework components:
```bash
npx agentlens compile
```
Emits:
- `public/.well-known/brand-facts.json` (Canonical machine ledger)
- `public/llms.txt` (With `## Boundaries & Negative Constraints` prioritized first)
- `components/AgentFacts.tsx` (Next.js / React)
- `components/AgentFacts.astro` (Astro)
- `snippets/agentlens-facts.liquid` (Shopify)
- `agentlens-facts.php` (WordPress)

### 3. CI Audit & GitHub SARIF
Audit your staging URL or local build artifact in GitHub Actions or locally:
```bash
# Audit a live URL
npx agentlens audit https://yourwebsite.com --threshold 80 --sarif

# Audit a local HTML build artifact
npx agentlens audit ./dist/index.html --threshold 80
```
Fails CI (`exit 1`) if $S_{\text{fetch}} < 80$, if any Negative Constraint is expired, or if visible parity fails. Emits `agentlens.sarif` for GitHub Code Scanning annotations.

---

## 🔌 IDE Model Context Protocol (MCP) Server

Connect AgentLens directly to **Cursor**, **Windsurf**, or **Claude Code**:

```json
{
  "mcpServers": {
    "agentlens": {
      "command": "npx",
      "args": ["-y", "@agentlens/mcp"]
    }
  }
}
```

### Available MCP Tools:
- `audit_url_or_html`: Computes $S_{\text{fetch}}$, $S_{\text{render}}$, and actionable deductions.
- `extract_ghost_csr_elements`: Pinpoints Next.js streaming traps and prices hidden in client JS.
- `compile_brand_facts`: Validates and compiles `facts.config.json`.
- `verify_claim_against_ncs`: Deterministically checks claims (`supported` | `contradicted` | `unknown`) against explicit boundaries.

---

## 🧩 Chrome MV3 Extension

Load `apps/extension/dist` as an unpacked extension in Chrome:
1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select `agentlens/apps/extension/dist`.
3. Open any website:
   - **Dual-Score Header**: Instant readout of $S_{\text{fetch}}$ vs $S_{\text{render}}$.
   - **Highlight Ghost Elements**: 1-click toggle that outlines elements missing from raw SSR in pulsing neon red with tooltip diagnostics.
   - **1-Click Fix Bundle Handoff**: Extracts missing facts and outputs ready-to-paste `facts.config.json`, JSON-LD, and Next.js / Shopify snippets.

---

## 🧪 Testing & Verification

Run the full deterministic test suite across the monorepo:
```bash
pnpm install
pnpm build
pnpm test
pnpm check-types
```

---

## 🤝 Contributing

We welcome community contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

Check out [Good First Issues](https://github.com/Buildingcoolstuff/agentlens/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) to get started.

---

## 📄 License

MIT © 2026 AgentLens Maintainers. Free for commercial and open-source use.
