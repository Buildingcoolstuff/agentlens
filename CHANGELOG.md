# Changelog

All notable changes to this project will be documented in this file.
See [Standard Version](https://conventionalcommits.org/) for commit guidelines.

## [1.0.0] - 2026-10-31

### Features
- **core**: Deterministic 7-pillar GEO scoring engine ($S_{\text{fetch}}$, $S_{\text{render}}$, blindness gap).
- **core**: RFC 9309 compliant `robots.txt` parser separating search bots, user-action fetchers, and training crawlers.
- **core**: Dual-DOM hydration differ with Next.js App Router streaming suspense trap detection (`id="S:..."`, `id="B:..."`).
- **core**: Fact-to-noise analyzer and top-30% quotability engine with bare-pronoun detection.
- **core**: JSON-LD graph integrity checker with visible parity enforcement and Wikidata sameAs verification.
- **core**: Deterministic Negative Constraint Schema (`ncs:v1`) guard with closed-world boundaries.
- **schema**: Zod schemas and TypeScript types for `facts.config.json`, `ncs:v1`, offerings, and reports.
- **runtime**: < 5 KB Zero-CLS AI Continuity Bar with Shadow DOM isolation and 3-layer AI arrival detection.
- **runtime**: Declarative W3C WebMCP bridge (`navigator.modelContext`) for browser agent tools.
- **cli**: `agentlens` CLI compiler (`init`, `compile`, `audit`, `sarif`) supporting local HTML files and remote URLs.
- **cli**: Automatic Wikidata Q-ID entity resolution with exponential backoff and rate limit handling.
- **cli**: Dynamic SVG badge generator and GitHub Code Scanning SARIF 2.1.0 exporter.
- **mcp**: Local stdio Model Context Protocol (MCP) server for Cursor, Windsurf, and Claude Code.
- **extension**: Chrome MV3 Extension with dual-score header, visual ghost overlay, and 1-click fix bundle exporter.

### Bug Fixes
- **core**: Fixed global RegExp `lastIndex` mutation bug in `quotability.ts` where sentence tests failed intermittently.
- **core**: Added explicit regex state resets for Next.js suspense traps in `differ.ts` and JSON-LD parser in `jsonld.ts`.
- **cli**: Added dual support for auditing local HTML files (`file.html`, `./dist/index.html`) as well as remote HTTP/HTTPS URLs.
- **cli**: Added timeout and exponential backoff retry to Wikidata API resolver.
- **extension**: Generated crisp multi-resolution extension icons (16, 32, 48, 128 px) and updated `manifest.json`.

### Tooling & CI
- Monorepo configured with Turborepo 2.x and pnpm 12 workspaces.
- GitHub Actions CI workflow with matrix testing across Node 18/20/22 on Ubuntu, macOS, and Windows.
- Automated Negative Constraint Schema expiry guard in CI.
- Full unit test coverage across all packages: `@agentlens/core`, `@agentlens/schema`, `agentlens` (CLI), `@agentlens/mcp`, and `@agentlens/runtime`.
