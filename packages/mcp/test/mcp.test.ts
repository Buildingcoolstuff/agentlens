import { describe, it, expect } from 'vitest';
import { createMcpServer } from '../src/server.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

describe('@agentlens/mcp — Local Stdio Server', () => {
  const server = createMcpServer();

  it('instantiates the MCP server successfully', () => {
    expect(server).toBeDefined();
  });

  it('exposes the 4 core deterministic GEO tools', async () => {
    // Invoke tool list handler
    const handlers = (server as unknown as { _requestHandlers: Map<unknown, (req: unknown) => Promise<unknown>> })._requestHandlers;
    
    // Find the ListTools handler
    let listToolsHandler: ((req: unknown) => Promise<{ tools: Array<{ name: string }> }>) | null = null;
    for (const [key, handler] of handlers.entries()) {
      if ((key as { shape?: { method?: { value?: string } } })?.shape?.method?.value === 'tools/list') {
        listToolsHandler = handler as typeof listToolsHandler;
        break;
      }
    }

    expect(listToolsHandler).toBeDefined();
    if (listToolsHandler) {
      const res = await listToolsHandler({ method: 'tools/list' });
      expect(res.tools.length).toBe(4);
      const toolNames = res.tools.map((t) => t.name);
      expect(toolNames).toContain('audit_url_or_html');
      expect(toolNames).toContain('extract_ghost_csr_elements');
      expect(toolNames).toContain('compile_brand_facts');
      expect(toolNames).toContain('verify_claim_against_ncs');
    }
  });

  it('verifies claims deterministically via verify_claim_against_ncs handler', async () => {
    const handlers = (server as unknown as { _requestHandlers: Map<unknown, (req: unknown) => Promise<unknown>> })._requestHandlers;
    let callToolHandler: ((req: unknown) => Promise<{ content: Array<{ text: string }> }>) | null = null;

    for (const [key, handler] of handlers.entries()) {
      if ((key as { shape?: { method?: { value?: string } } })?.shape?.method?.value === 'tools/call') {
        callToolHandler = handler as typeof callToolHandler;
        break;
      }
    }

    expect(callToolHandler).toBeDefined();
    if (callToolHandler) {
      const ncs = {
        schemaVersion: 'ncs:v1' as const,
        constraints: [
          {
            id: 'nc-waterproof',
            capability: 'waterproof',
            value: false as const,
            modality: 'cannot' as const,
            statement: 'No. The shoe is not waterproof.',
            asOf: '2026-10-01',
            reviewBy: '2027-10-01',
            evidence: 'https://example.com',
            aliases: ['water resistance', 'rain proof'],
          },
        ],
        closedWorld: [],
      };

      const res = await callToolHandler({
        method: 'tools/call',
        params: {
          name: 'verify_claim_against_ncs',
          arguments: {
            claim: 'This shoe is 100% waterproof for running in deep puddles.',
            ncs,
          },
        },
      });

      const parsed = JSON.parse(res.content[0]!.text);
      expect(parsed.status).toBe('contradicted');
      expect(parsed.confidence).toBe(1.0);
    }
  });
});
