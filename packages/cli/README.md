# agentlens

> The Open-Source Generative Engine Optimization (GEO) & Agentic Web CLI.

[![npm version](https://img.shields.io/npm/v/agentlens.svg?style=flat-square)](https://www.npmjs.com/package/agentlens)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

## Overview

`agentlens` is the command-line interface for auditing websites, compiling facts ledgers, verifying boundaries, and integrating GEO scoring into CI/CD pipelines.

---

## Commands

### `npx agentlens audit <url-or-file> [options]`
Runs the deterministic 7-pillar GEO scorer against a live URL or a local built HTML file.

```bash
# Audit a live production website
npx agentlens audit https://garuda.shoes

# Audit a local HTML build artifact in CI
npx agentlens audit ./dist/index.html --threshold 80

# Export SARIF for GitHub Code Scanning
npx agentlens audit https://example.com --sarif
```

### `npx agentlens init`
Interactive CLI wizard that scaffolds `facts.config.json` with automatic Wikidata Q-ID resolution.

```bash
npx agentlens init
```

### `npx agentlens compile`
Compiles `facts.config.json` into:
- `public/.well-known/brand-facts.json`
- `public/llms.txt` (with Negative Constraints in upper-third)
- React component (`components/AgentFacts.tsx`)
- Astro component (`components/AgentFacts.astro`)
- Shopify Liquid snippet (`snippets/agentlens-facts.liquid`)
- WordPress PHP snippet (`agentlens-facts.php`)

```bash
npx agentlens compile
```

---

## License

MIT © AgentLens Maintainers
