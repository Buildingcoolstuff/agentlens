/**
 * AgentLens Local Model Context Protocol (MCP) Server (server.ts)
 *
 * Exposes deterministic GEO tools over stdio for Cursor, Windsurf, Claude Code:
 *  - audit_url_or_html
 *  - extract_ghost_csr_elements
 *  - compile_brand_facts
 *  - verify_claim_against_ncs
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { auditAndScore, diffDualDOM, verifyClaimAgainstNcs } from '@agentlens/core';
import type { FactsConfig, NegativeConstraintSchemaV1Type } from '@agentlens/schema';
import { FactsConfigSchema } from '@agentlens/schema';
import fs from 'node:fs';
import path from 'node:path';

export function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'agentlens-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'audit_url_or_html',
          description:
            'Runs the deterministic 7-pillar AgentLens GEO scorer against a live URL or raw HTML string. Returns bot score (S_fetch), human score (S_render), blindness gap, and actionable deductions.',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'Target URL to fetch and audit' },
              rawHtml: { type: 'string', description: 'Raw initial SSR HTML (optional if url provided)' },
              hydratedHtml: { type: 'string', description: 'Live hydrated DOM HTML (optional)' },
              robotsTxt: { type: 'string', description: 'Raw robots.txt content (optional)' },
            },
          },
        },
        {
          name: 'extract_ghost_csr_elements',
          description:
            'Identifies Next.js App Router streaming suspense traps and ghost elements (prices, specs, headings) that are visible in the browser but missing in raw SSR HTML.',
          inputSchema: {
            type: 'object',
            properties: {
              rawHtml: { type: 'string', description: 'Initial server response HTML' },
              hydratedHtml: { type: 'string', description: 'Rendered DOM HTML after client JS runs' },
            },
            required: ['rawHtml', 'hydratedHtml'],
          },
        },
        {
          name: 'compile_brand_facts',
          description:
            'Compiles facts.config.json into a canonical public/.well-known/brand-facts.json ledger, prioritized llms.txt, and synchronized React/Liquid components.',
          inputSchema: {
            type: 'object',
            properties: {
              config: {
                type: 'object',
                description: 'The facts.config.json object structure. If omitted, reads local facts.config.json from disk.',
              },
            },
          },
        },
        {
          name: 'verify_claim_against_ncs',
          description:
            'Deterministically verifies whether an AI-generated claim complies with or contradicts the Negative Constraint Schema (NCS v1) and Closed-World sets. Returns "supported", "contradicted", or "unknown".',
          inputSchema: {
            type: 'object',
            properties: {
              claim: { type: 'string', description: 'The natural language statement or feature claim to verify' },
              ncs: { type: 'object', description: 'NegativeConstraintSchemaV1 object (optional, will attempt reading local facts.config.json)' },
            },
            required: ['claim'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'audit_url_or_html') {
        const rawUrl = (args?.['url'] as string) || 'https://localhost:3000';
        let rawHtml = (args?.['rawHtml'] as string) || '';
        const hydratedHtml = (args?.['hydratedHtml'] as string) || rawHtml;
        let robotsTxt = (args?.['robotsTxt'] as string) || null;

        if (!rawHtml && args?.['url']) {
          const res = await fetch(rawUrl, {
            headers: { 'User-Agent': 'AgentLens-AuditBot/1.0', 'Cache-Control': 'no-cache' },
          });
          rawHtml = await res.text();

          try {
            const u = new URL(rawUrl);
            const rRes = await fetch(`${u.origin}/robots.txt`);
            if (rRes.ok) robotsTxt = await rRes.text();
          } catch {
            // ignore
          }
        }

        const report = auditAndScore({
          targetUrl: rawUrl,
          rawHtml,
          hydratedHtml,
          robotsTxt,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(report, null, 2),
            },
          ],
        };
      }

      if (name === 'extract_ghost_csr_elements') {
        const rawHtml = String(args?.['rawHtml'] || '');
        const hydratedHtml = String(args?.['hydratedHtml'] || '');

        const diff = diffDualDOM(rawHtml, hydratedHtml);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ghostElements: diff.ghostElements,
                  suspenseTrapsCount: diff.suspenseTrapsCount,
                  hasSuspenseTraps: diff.hasSuspenseTraps,
                  isEmptyCsrShell: diff.isEmptyCsrShell,
                  blockRecall: diff.blockRecall,
                  jaccardSimilarity: diff.jaccardSimilarity,
                  numericTokenRecall: diff.numericTokenRecall,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (name === 'compile_brand_facts') {
        let configObj = args?.['config'] as FactsConfig | undefined;

        if (!configObj) {
          const cfgPath = path.join(process.cwd(), 'facts.config.json');
          if (fs.existsSync(cfgPath)) {
            configObj = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as FactsConfig;
          } else {
            throw new Error('No config provided and facts.config.json not found in current directory.');
          }
        }

        const validConfig = FactsConfigSchema.parse(configObj);
        const { offerings, entity, ncs } = validConfig;

        // Build llms.txt content
        const boundariesText = ncs.constraints
          .map((c) => `- **${c.capability.toUpperCase()}**: ${c.statement}`)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'success',
                  entity: entity.name,
                  offeringsCount: offerings.length,
                  boundariesPreview: boundariesText,
                  message: 'Successfully validated brand facts structure. Run `npx agentlens compile` to generate file artifacts.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (name === 'verify_claim_against_ncs') {
        const claim = String(args?.['claim'] || '');
        let ncs = args?.['ncs'] as NegativeConstraintSchemaV1Type | undefined;

        if (!ncs) {
          const cfgPath = path.join(process.cwd(), 'facts.config.json');
          if (fs.existsSync(cfgPath)) {
            const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { ncs?: NegativeConstraintSchemaV1Type };
            ncs = raw.ncs;
          }
        }

        if (!ncs) {
          throw new Error('NCS schema was not provided in arguments and facts.config.json was not found.');
        }

        const verification = verifyClaimAgainstNcs(claim, ncs);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(verification, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [{ type: 'text', text: `Tool error: ${errMsg}` }],
      };
    }
  });

  return server;
}
