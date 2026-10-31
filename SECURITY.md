# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Active  |

## Scope

AgentLens is a **local-first, zero-backend** tool. It never sends your page content, brand facts, or NCS constraints to any remote server. The attack surface is limited, but we take security seriously.

**In-scope vulnerabilities:**
- Prototype pollution via malformed `facts.config.json` input
- ReDoS (Regular Expression Denial of Service) in `robots.txt` parser or HTML differ
- Path traversal in the CLI when writing compiled output files
- Arbitrary code execution via malformed JSON-LD in audited pages
- MCP server authentication bypass or command injection
- Chrome extension content-script XSS or privilege escalation

**Out of scope:**
- Security issues in audited third-party websites (that's what AgentLens *finds*, not causes)
- Social engineering attacks
- Physical attacks against devices running AgentLens

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/Buildingcoolstuff/agentlens/security/advisories/new).

You can expect:
- **Acknowledgement** within 48 hours
- **Status update** within 7 days
- **Patch or mitigation** within 30 days for high/critical severity
- **Public disclosure** coordinated with you after a fix is available

We follow responsible disclosure and will credit reporters in the release notes (unless you prefer to remain anonymous).

## Security Best Practices for Users

- Pin AgentLens to a specific version in CI: `npx agentlens@1.0.0 audit`
- The MCP server (`@agentlens/mcp`) listens only on `stdio` — never expose it over a network port
- `facts.config.json` is public by design — do not store secrets in it
- Review NCS constraint `reviewBy` dates before deploying; expired constraints fail CI by default
