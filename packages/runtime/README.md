# @agentlens/runtime

> Ultra-lightweight Zero-CLS AI Continuity Bar & W3C WebMCP (`navigator.modelContext`) Browser Bridge.

[![npm version](https://img.shields.io/npm/v/@agentlens/runtime.svg?style=flat-square)](https://www.npmjs.com/package/@agentlens/runtime)
[![Bundle Size](https://img.shields.io/badge/bundle%20size-%3C%204.1%20KB%20gzip-brightgreen?style=flat-square)](https://bundlephobia.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

## Overview

`@agentlens/runtime` is a zero-dependency, universal browser script that:
1. **Detects AI-referred visitors**: 3-layer detection via UTM sources, text-fragment deep links (`#:~:text=`), and scroll-Y landing inference.
2. **Mounts the Zero-CLS Floating Continuity Bar**: Shadow DOM-isolated widget verifying canonical entity claims, pricing, and negative boundaries without causing layout shifts (`contain: layout paint`).
3. **Registers W3C WebMCP Client Tools**: Exposes `get_verified_brand_facts`, `check_product_compatibility`, and `get_live_offer` to browser agents via `navigator.modelContext` (Chrome 146+).

---

## Installation & Usage

### 1. Script Tag (Zero Build Setup)

```html
<script src="https://unpkg.com/@agentlens/runtime/dist/continuity.iife.js" async defer></script>
```

### 2. npm / Bundler Setup

```bash
pnpm add @agentlens/runtime
```

```typescript
import { initAgentLensRuntime } from '@agentlens/runtime';

// Initializes WebMCP bridge, AI intent detection, and continuity overlay
initAgentLensRuntime();
```

---

## License

MIT © AgentLens Maintainers
