# @agentlens/mcp

> Local stdio Model Context Protocol (MCP) server for Cursor, Windsurf, and Claude Code.

[![npm version](https://img.shields.io/npm/v/@agentlens/mcp.svg?style=flat-square)](https://www.npmjs.com/package/@agentlens/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

## Overview

`@agentlens/mcp` brings deterministic Generative Engine Optimization (GEO) scoring and Negative Constraint Schema verification directly into your AI coding assistant.

---

## Exposed MCP Tools

1. `audit_url_or_html`: Runs the 7-pillar scorer on any live URL or raw HTML string.
2. `extract_ghost_csr_elements`: Pinpoints Next.js App Router streaming traps and CSR ghost elements.
3. `compile_brand_facts`: Compiles `facts.config.json` into canonical artifacts directly from your editor.
4. `verify_claim_against_ncs`: Deterministically validates natural language claims against Negative Constraints (`ncs:v1`).

---

## IDE Configuration

### Cursor (`.cursor/mcp.json`)
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

### Claude Desktop (`claude_desktop_config.json`)
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

---

## License

MIT © AgentLens Maintainers
