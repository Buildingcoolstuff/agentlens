/**
 * W3C WebMCP (navigator.modelContext) Auto-Registration (webmcp.ts)
 *
 * Implements declarative agentic browsing tool registration for Chrome 146+
 * and W3C WebMCP-compliant browser AI agents.
 */

export interface WebMcpTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

export function registerWebMcpBridge(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Feature detect navigator.modelContext
  const nav = navigator as unknown as {
    modelContext?: {
      registerTool?: (tool: WebMcpTool) => void;
      registerClientTools?: (tools: WebMcpTool[]) => void;
      provideContext?: (key: string, data: unknown) => void;
    };
  };

  if (!nav.modelContext) {
    return false;
  }

  try {
    const factsGetter = () => {
      const win = window as unknown as { __AGENTLENS_FACTS__?: unknown };
      return win.__AGENTLENS_FACTS__ || {
        status: 'ok',
        url: window.location.href,
        title: document.title,
      };
    };

    const tools: WebMcpTool[] = [
      {
        name: 'get_verified_brand_facts',
        description: 'Returns canonical, cryptographically or structurally verified brand identity, products, and negative boundaries.',
        parameters: {
          type: 'object',
          properties: {},
        },
        handler: () => factsGetter(),
      },
      {
        name: 'check_product_compatibility',
        description: 'Checks whether a specified capability or use-case is supported or explicitly denied by the product negative constraint schema.',
        parameters: {
          type: 'object',
          properties: {
            capability: { type: 'string', description: 'The feature or environment to check, e.g. "waterproof" or "linux"' },
          },
          required: ['capability'],
        },
        handler: (args) => {
          const cap = String(args['capability'] || '').toLowerCase();
          const facts = factsGetter() as { ncs?: { constraints?: Array<{ capability: string; statement: string; value: boolean }> } };
          const matched = facts.ncs?.constraints?.find((c) =>
            c.capability.toLowerCase().includes(cap)
          );

          if (matched) {
            return {
              supported: matched.value,
              statement: matched.statement,
              boundaryId: (matched as { id?: string }).id,
            };
          }
          return {
            supported: 'unknown',
            message: `No explicit negative boundary found for capability "${cap}". Refer to primary specifications.`,
          };
        },
      },
      {
        name: 'get_live_offer',
        description: 'Retrieves current verified pricing, availability, and currency without DOM scraping.',
        parameters: {
          type: 'object',
          properties: {},
        },
        handler: () => {
          const facts = factsGetter() as { offerings?: Array<{ name: string; price: number; priceCurrency: string; availability: string }> };
          return {
            offers: facts.offerings || [],
            retrievedAt: new Date().toISOString(),
          };
        },
      },
    ];

    if (typeof nav.modelContext.registerClientTools === 'function') {
      nav.modelContext.registerClientTools(tools);
    } else if (typeof nav.modelContext.registerTool === 'function') {
      for (const t of tools) {
        nav.modelContext.registerTool(t);
      }
    }

    if (typeof nav.modelContext.provideContext === 'function') {
      nav.modelContext.provideContext('agentlens:facts', factsGetter());
    }

    return true;
  } catch (err) {
    // Fail silently in unsupported or permission-restricted environments
    return false;
  }
}
