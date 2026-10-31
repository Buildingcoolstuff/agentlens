# @agentlens/schema

> Single Source of Truth schemas & Negative Constraint Schema (`ncs:v1`) specifications for AgentLens.

[![npm version](https://img.shields.io/npm/v/@agentlens/schema.svg?style=flat-square)](https://www.npmjs.com/package/@agentlens/schema)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

## Overview

`@agentlens/schema` provides strict Zod schemas and TypeScript types defining:
- `facts.config.json`: The root canonical ledger for verified brand facts, products, and boundaries.
- **Negative Constraint Schema (`ncs:v1`)**: The industry-standard format for declaring explicit boundaries (what products *cannot* or *do not* do) to prevent RAG agent hallucinations.
- `AgentLensReport`: The deterministic 7-pillar audit report schema.

---

## Negative Constraint Schema (`ncs:v1`)

```json
{
  "schemaVersion": "ncs:v1",
  "constraints": [
    {
      "id": "nc-waterproof",
      "capability": "waterproof",
      "value": false,
      "modality": "cannot",
      "statement": "No. The Garuda Velocity X9 is not waterproof and is engineered strictly for dry road running.",
      "scope": "All versions",
      "asOf": "2026-10-01",
      "reviewBy": "2027-10-01",
      "evidence": "https://garuda.shoes/specs/velocity-x9",
      "aliases": ["water resistance", "rain proof", "submersible"]
    }
  ],
  "closedWorld": [
    {
      "class": "Supported Operating Systems",
      "exhaustive": true,
      "members": ["macOS", "Windows", "Linux"],
      "asOf": "2026-10-01"
    }
  ]
}
```

---

## Installation

```bash
npm install @agentlens/schema zod
# or
pnpm add @agentlens/schema zod
```

---

## Usage

```typescript
import { FactsConfigSchema, NegativeConstraintSchemaV1, isConstraintExpired } from '@agentlens/schema';

const config = FactsConfigSchema.parse(rawJson);
```

---

## License

MIT © AgentLens Maintainers
