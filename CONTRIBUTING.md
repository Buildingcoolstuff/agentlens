# Contributing to AgentLens

First off — thank you for investing your time in contributing to AgentLens! 🎉

AgentLens is the open-source engine for **Generative Engine Optimization (GEO)** and **Agentic Web Readiness**. Every contribution — from a one-line typo fix to a new scoring pillar — helps make the agentic web safer, more accurate, and more transparent for everyone.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Project Architecture](#project-architecture)
3. [Development Setup](#development-setup)
4. [Running the Project Locally](#running-the-project-locally)
5. [Testing](#testing)
6. [Making Changes](#making-changes)
7. [Commit Style](#commit-style)
8. [Pull Request Process](#pull-request-process)
9. [Versioning & Releases](#versioning--releases)
10. [Good First Issues](#good-first-issues)

---

## Code of Conduct

All contributors must adhere to our [Code of Conduct](./CODE_OF_CONDUCT.md). TL;DR: be kind, be constructive, be excellent to each other.

---

## Project Architecture

AgentLens is a **Turborepo + pnpm workspaces** monorepo:

```
agentlens/
├── packages/
│   ├── schema/    @agentlens/schema  — Zod schemas & NCS v1 types
│   ├── core/      @agentlens/core    — Deterministic scoring engine (Node / Workers / browser)
│   ├── runtime/   @agentlens/runtime — Zero-CLS AI Continuity Bar (< 5 KB IIFE)
│   ├── cli/       agentlens          — CLI compiler & audit tool
│   └── mcp/       @agentlens/mcp     — Local stdio MCP server
└── apps/
    └── extension/ Chrome MV3 Extension
```

**Golden rules:**
- `@agentlens/core` has **zero runtime dependencies** — it must run in any JS environment
- `@agentlens/runtime` IIFE must stay **≤ 5 KB gzipped** (we aim for < 2.8 KB)
- No `any` types — ever. Use `unknown` and narrow properly.
- All scores are **deterministic** — same input must always produce the same output

---

## Development Setup

### Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | 18.x (20.x recommended) |
| pnpm | 12.x |
| Git | 2.x |

**macOS / Linux:**
```bash
# Install pnpm via corepack
corepack enable
corepack prepare pnpm@12.14.0 --activate
```

**Windows:**
```powershell
# Install pnpm via npm
npm install -g pnpm@12.14.0
```

### Clone & Install

```bash
git clone https://github.com/Buildingcoolstuff/agentlens.git
cd agentlens
pnpm install
```

If you get an `ERR_PNPM_IGNORED_BUILDS` error, run:
```bash
pnpm approve-builds --all
```

---

## Running the Project Locally

```bash
# Build all packages (Turborepo will cache)
pnpm build

# TypeScript strict check across all workspaces
pnpm check-types

# Run all tests
pnpm test

# Watch mode for a specific package
pnpm --filter @agentlens/core test --watch

# Run the CLI in development
pnpm --filter agentlens dev

# Build the Chrome extension
pnpm --filter @agentlens/extension build
```

### Test the CLI against the Garuda demo

```bash
# First, build everything
pnpm build

# Run a GEO audit against the local testbed
node packages/cli/dist/index.js audit examples/garuda-storefront/index.html

# Or audit a live URL
node packages/cli/dist/index.js audit https://example.com

# Export SARIF for GitHub Code Scanning
node packages/cli/dist/index.js audit https://example.com --sarif > results.sarif
```

---

## Testing

We use [Vitest](https://vitest.dev/) for unit tests.

```bash
# All tests
pnpm test

# Specific package
pnpm --filter @agentlens/core test

# With coverage
pnpm --filter @agentlens/core test --coverage

# Watch
pnpm --filter @agentlens/core test --watch
```

### Test file conventions

- Place tests in `src/__tests__/` within each package
- File naming: `<module>.test.ts`
- Each exported function must have at least one test
- For new scoring rules: add a test with a passing case and a failing case

---

## Making Changes

1. **Fork** the repo and create a branch:
   ```bash
   git checkout -b feat/my-new-pillar
   # or
   git checkout -b fix/robots-parser-edge-case
   ```

2. **Make your changes** — follow the patterns already established in the codebase

3. **Run the full check suite:**
   ```bash
   pnpm build && pnpm check-types && pnpm test
   ```

4. **Add a changeset** (for package version bumps):
   ```bash
   pnpm changeset
   # Select the affected packages and bump type (patch / minor / major)
   ```

5. **Commit** using [Conventional Commits](#commit-style)

6. **Push and open a PR**

---

## Commit Style

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

| Type | When to use |
|------|-------------|
| `feat` | New feature or scoring rule |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `test` | Tests only |
| `chore` | Build, CI, tooling, version bumps |
| `refactor` | Code change with no behaviour change |
| `perf` | Performance improvement |

**Scope** should be the package name: `core`, `schema`, `runtime`, `cli`, `mcp`, `extension`.

Examples:
```
feat(core): add GPTBot-User as advisory fetcher category
fix(cli): handle rate limiting in Wikidata resolver with exponential backoff
docs(schema): add JSDoc to all NCS constraint fields
perf(runtime): reduce IIFE bundle by lazy-loading WebMCP bridge
```

---

## Pull Request Process

1. Open a PR against `main`
2. Fill out the PR template completely — especially the testing instructions
3. CI must pass (build + typecheck + test + bundle size guard)
4. At least one maintainer approval required
5. Squash merge preferred for features; merge commit for releases

**PR titles** must follow Conventional Commits format — they become the changelog entries.

---

## Versioning & Releases

AgentLens uses [Changesets](https://github.com/changesets/changesets) for versioning:

1. Run `pnpm changeset` in the repo root
2. Select the packages you changed and the bump type
3. Commit the generated `.changeset/*.md` file with your PR
4. When merged to `main`, the Release workflow opens a "Version Packages" PR
5. Merging that PR publishes to npm

---

## Good First Issues

Look for issues tagged [`good first issue`](https://github.com/Buildingcoolstuff/agentlens/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) — these are intentionally scoped to be approachable for first-time contributors.

Some examples:
- Adding JSDoc to exported functions in `@agentlens/schema`
- Adding a test case for a specific robots.txt pattern
- Improving error messages in the CLI `init` command
- Adding a new puffery keyword to the quotability lexicon

---

## Questions?

Open a [Discussion](https://github.com/Buildingcoolstuff/agentlens/discussions) — we're happy to help.
