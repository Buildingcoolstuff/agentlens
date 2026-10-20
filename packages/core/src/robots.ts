/**
 * RFC 9309 Compliant robots.txt Parser & AI Bot Categorizer
 *
 * Implements standard Section 2.2.2 path pattern matching (* and $),
 * precedence (longest pattern match, Allow breaks ties), and categorizes
 * bots into:
 *  - AI Search & Retrieval Crawlers (influences GEO search index score)
 *  - User-Action Realtime Fetchers (advisory for user-driven RAG queries)
 *  - Foundational Training Crawlers (policy badge only, zero penalty)
 */

export type BotCategory = 'search' | 'user-action' | 'training' | 'general';

export interface BotClassification {
  name: string;
  category: BotCategory;
  advisoryOnly: boolean;
  penalizeOnBlock: boolean;
  description: string;
}

export const KNOWN_AI_BOTS: Record<string, BotClassification> = {
  // AI Retrieval / Search Index Bots (Must be allowed for GEO)
  'oai-searchbot': {
    name: 'OAI-SearchBot',
    category: 'search',
    advisoryOnly: false,
    penalizeOnBlock: true,
    description: 'OpenAI search indexing bot for ChatGPT Search',
  },
  'claude-searchbot': {
    name: 'Claude-SearchBot',
    category: 'search',
    advisoryOnly: false,
    penalizeOnBlock: true,
    description: 'Anthropic search indexer for Claude search features',
  },
  'perplexitybot': {
    name: 'PerplexityBot',
    category: 'search',
    advisoryOnly: false,
    penalizeOnBlock: true,
    description: 'Perplexity AI search engine crawler',
  },
  'googlebot': {
    name: 'Googlebot',
    category: 'search',
    advisoryOnly: false,
    penalizeOnBlock: true,
    description: 'Google Web & AI Overviews indexer',
  },
  'bingbot': {
    name: 'bingbot',
    category: 'search',
    advisoryOnly: false,
    penalizeOnBlock: true,
    description: 'Microsoft Bing and Copilot search indexer',
  },

  // User-Initiated Realtime Fetchers (robots.txt is advisory only per vendor policies)
  'chatgpt-user': {
    name: 'ChatGPT-User',
    category: 'user-action',
    advisoryOnly: true,
    penalizeOnBlock: false,
    description: 'User-directed real-time browsing in ChatGPT',
  },
  'claude-user': {
    name: 'Claude-User',
    category: 'user-action',
    advisoryOnly: true,
    penalizeOnBlock: false,
    description: 'User-directed link viewing in Claude',
  },
  'perplexity-user': {
    name: 'Perplexity-User',
    category: 'user-action',
    advisoryOnly: true,
    penalizeOnBlock: false,
    description: 'Direct user search query fetcher in Perplexity',
  },

  // Foundation Model Training Crawlers (Policy badge; blocking does NOT penalize GEO search readiness)
  'gptbot': {
    name: 'GPTBot',
    category: 'training',
    advisoryOnly: false,
    penalizeOnBlock: false,
    description: 'OpenAI foundational model training data crawler',
  },
  'claudebot': {
    name: 'ClaudeBot',
    category: 'training',
    advisoryOnly: false,
    penalizeOnBlock: false,
    description: 'Anthropic model training crawler',
  },
  'google-extended': {
    name: 'Google-Extended',
    category: 'training',
    advisoryOnly: false,
    penalizeOnBlock: false,
    description: 'Google Gemini & Vertex AI foundational training crawler',
  },
  'ccbot': {
    name: 'CCBot',
    category: 'training',
    advisoryOnly: false,
    penalizeOnBlock: false,
    description: 'Common Crawl foundational corpus bot',
  },
  'applebot-extended': {
    name: 'Applebot-Extended',
    category: 'training',
    advisoryOnly: false,
    penalizeOnBlock: false,
    description: 'Apple Intelligence model training data crawler',
  },
  'bytespider': {
    name: 'Bytespider',
    category: 'training',
    advisoryOnly: false,
    penalizeOnBlock: false,
    description: 'ByteDance AI training crawler',
  },
  'diffbot': {
    name: 'Diffbot',
    category: 'training',
    advisoryOnly: false,
    penalizeOnBlock: false,
    description: 'Diffbot Knowledge Graph extraction crawler',
  },
  'facebookbot': {
    name: 'FacebookBot',
    category: 'training',
    advisoryOnly: false,
    penalizeOnBlock: false,
    description: 'Meta AI speech and language training crawler',
  },
};

export interface RobotRule {
  type: 'allow' | 'disallow';
  pattern: string;
  patternLength: number;
  regex: RegExp;
}

export interface UserAgentGroup {
  agents: string[];
  rules: RobotRule[];
}

export interface RobotsParsed {
  groups: UserAgentGroup[];
  sitemaps: string[];
}

export interface BotAccessResult {
  botName: string;
  category: BotCategory;
  allowed: boolean;
  matchingRule: { type: 'allow' | 'disallow'; pattern: string } | null;
  advisoryOnly: boolean;
  penalizeOnBlock: boolean;
  matchedAgentHeader: string;
  description: string;
}

export interface RobotsAuditResult {
  isAvailable: boolean;
  botResults: BotAccessResult[];
  searchBotsBlockedCount: number;
  totalSearchBotsCount: number;
  allSearchBotsAllowed: boolean;
  policyBadges: Array<{ bot: string; allowed: boolean; category: BotCategory }>;
  sitemaps: string[];
}

/**
 * Compiles an RFC 9309 path pattern into a regular expression.
 * Pattern supports wildcard '*' and end-of-string '$'.
 */
function patternToRegex(pattern: string): RegExp {
  if (!pattern || pattern === '') {
    return /^$/;
  }

  // Check if pattern ends with $
  const endsWithDollar = pattern.endsWith('$');
  const cleanPattern = endsWithDollar ? pattern.slice(0, -1) : pattern;

  // Escape special regex characters except '*'
  const escaped = cleanPattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

  if (endsWithDollar) {
    return new RegExp(`^${escaped}$`);
  }
  // RFC 9309: By default, pattern matches any path starting with pattern
  return new RegExp(`^${escaped}`);
}

/**
 * Parses raw robots.txt content into RFC 9309 structured rules.
 */
export function parseRobotsTxt(content: string): RobotsParsed {
  const lines = content.split(/\r?\n/);
  const groups: UserAgentGroup[] = [];
  const sitemaps: string[] = [];

  let currentAgents: string[] = [];
  let currentRules: RobotRule[] = [];

  function flushGroup() {
    if (currentAgents.length > 0) {
      groups.push({
        agents: currentAgents.map((a) => a.toLowerCase()),
        rules: currentRules,
      });
      currentAgents = [];
      currentRules = [];
    }
  }

  for (const rawLine of lines) {
    // Strip comments
    const commentIdx = rawLine.indexOf('#');
    const line = (commentIdx >= 0 ? rawLine.slice(0, commentIdx) : rawLine).trim();
    if (!line) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (key === 'user-agent') {
      if (currentRules.length > 0) {
        flushGroup();
      }
      currentAgents.push(value);
    } else if (key === 'allow' || key === 'disallow') {
      if (currentAgents.length === 0) {
        // Stray rule before any user-agent, ignore per spec
        continue;
      }
      if (value === '' && key === 'disallow') {
        // RFC 9309 Section 2.2.1: Disallow with empty value means ALLOW ALL
        currentRules.push({
          type: 'allow',
          pattern: '',
          patternLength: 0,
          regex: /^.*$/,
        });
      } else if (value !== '') {
        currentRules.push({
          type: key as 'allow' | 'disallow',
          pattern: value,
          patternLength: value.length,
          regex: patternToRegex(value),
        });
      }
    } else if (key === 'sitemap') {
      if (value) {
        sitemaps.push(value);
      }
    }
  }

  flushGroup();
  return { groups, sitemaps };
}

/**
 * Checks whether a given path is allowed for a given bot per RFC 9309 Section 2.2.2.
 * Precedence rule:
 * 1. Find group matching bot specifically. If none, fallback to '*' group.
 * 2. Find all matching rules.
 * 3. Longest pattern match takes precedence!
 * 4. If length is identical, 'allow' takes precedence over 'disallow'.
 */
export function checkBotPath(
  robots: RobotsParsed,
  botName: string,
  pathname: string = '/'
): { allowed: boolean; matchingRule: { type: 'allow' | 'disallow'; pattern: string } | null; matchedAgent: string } {
  const normBot = botName.toLowerCase();

  // Find most specific group
  let targetGroup: UserAgentGroup | null = null;
  let matchedAgent = '*';

  // 1. Exact bot match
  for (const group of robots.groups) {
    if (group.agents.includes(normBot)) {
      targetGroup = group;
      matchedAgent = normBot;
      break;
    }
  }

  // 2. Fallback to '*' wildcard group
  if (!targetGroup) {
    for (const group of robots.groups) {
      if (group.agents.includes('*')) {
        targetGroup = group;
        matchedAgent = '*';
        break;
      }
    }
  }

  // If no group applies, default is ALLOWED
  if (!targetGroup || targetGroup.rules.length === 0) {
    return { allowed: true, matchingRule: null, matchedAgent };
  }

  // Find all matching rules
  const matchingRules: RobotRule[] = [];
  for (const rule of targetGroup.rules) {
    if (rule.regex.test(pathname)) {
      matchingRules.push(rule);
    }
  }

  if (matchingRules.length === 0) {
    return { allowed: true, matchingRule: null, matchedAgent };
  }

  // Sort by longest pattern length descending.
  // If equal length, 'allow' comes before 'disallow' (RFC 9309 section 2.2.2)
  matchingRules.sort((a, b) => {
    if (b.patternLength !== a.patternLength) {
      return b.patternLength - a.patternLength;
    }
    if (a.type === 'allow' && b.type === 'disallow') return -1;
    if (a.type === 'disallow' && b.type === 'allow') return 1;
    return 0;
  });

  const bestMatch = matchingRules[0];
  if (!bestMatch) {
    return { allowed: true, matchingRule: null, matchedAgent };
  }

  return {
    allowed: bestMatch.type === 'allow',
    matchingRule: { type: bestMatch.type, pattern: bestMatch.pattern },
    matchedAgent,
  };
}

/**
 * Runs a complete audit on robots.txt for all known AI bots at a given path.
 */
export function auditRobotsForPath(robotsContent: string | null, pathname: string = '/'): RobotsAuditResult {
  if (!robotsContent) {
    // If robots.txt doesn't exist (404), RFC 9309 treats everything as allowed
    const botResults: BotAccessResult[] = Object.values(KNOWN_AI_BOTS).map((info) => ({
      botName: info.name,
      category: info.category,
      allowed: true,
      matchingRule: null,
      advisoryOnly: info.advisoryOnly,
      penalizeOnBlock: info.penalizeOnBlock,
      matchedAgentHeader: '*',
      description: info.description,
    }));

    return {
      isAvailable: false,
      botResults,
      searchBotsBlockedCount: 0,
      totalSearchBotsCount: botResults.filter((b) => b.category === 'search').length,
      allSearchBotsAllowed: true,
      policyBadges: botResults.map((b) => ({ bot: b.botName, allowed: true, category: b.category })),
      sitemaps: [],
    };
  }

  const parsed = parseRobotsTxt(robotsContent);
  const botResults: BotAccessResult[] = [];
  const policyBadges: Array<{ bot: string; allowed: boolean; category: BotCategory }> = [];

  let searchBotsBlockedCount = 0;
  let totalSearchBotsCount = 0;

  for (const botKey of Object.keys(KNOWN_AI_BOTS)) {
    const info = KNOWN_AI_BOTS[botKey]!;
    const check = checkBotPath(parsed, info.name, pathname);

    botResults.push({
      botName: info.name,
      category: info.category,
      allowed: check.allowed,
      matchingRule: check.matchingRule,
      advisoryOnly: info.advisoryOnly,
      penalizeOnBlock: info.penalizeOnBlock,
      matchedAgentHeader: check.matchedAgent,
      description: info.description,
    });

    policyBadges.push({
      bot: info.name,
      allowed: check.allowed,
      category: info.category,
    });

    if (info.category === 'search') {
      totalSearchBotsCount++;
      if (!check.allowed) {
        searchBotsBlockedCount++;
      }
    }
  }

  return {
    isAvailable: true,
    botResults,
    searchBotsBlockedCount,
    totalSearchBotsCount,
    allSearchBotsAllowed: searchBotsBlockedCount === 0,
    policyBadges,
    sitemaps: parsed.sitemaps,
  };
}
