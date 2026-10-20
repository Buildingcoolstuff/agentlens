/**
 * Deterministic 7-Pillar Scorer (scorer.ts)
 *
 * Computes:
 *   S_fetch (0-100): What non-rendering AI crawlers see
 *   S_render (0-100): What full JS-rendering browsers see
 *   blindnessGap = S_render - S_fetch
 *
 * Applies hard gates and calculates exact, reproducible point deductions
 * with evidence and exact fixes.
 */

import type {
  AgentLensReport,
  Deduction,
  PillarName,
  PillarScoreBreakdown,
  NegativeConstraintSchemaV1Type,
} from '@agentlens/schema';
import { auditRobotsForPath } from './robots.js';
import { diffDualDOM } from './differ.js';
import { analyzeQuotability } from './quotability.js';
import { auditJsonLd } from './jsonld.js';
import { auditNcsConstraints } from './ncs.js';

export interface AuditInput {
  targetUrl: string;
  rawHtml: string;
  hydratedHtml?: string;
  robotsTxt?: string | null;
  ncsConfig?: NegativeConstraintSchemaV1Type;
}

export function auditAndScore(input: AuditInput): AgentLensReport {
  const startTime = Date.now();
  const urlObj = new URL(input.targetUrl);
  const pathname = urlObj.pathname || '/';

  const rawHtml = input.rawHtml || '';
  const hydratedHtml = input.hydratedHtml || rawHtml;

  // Run all deterministic engines
  const robotsAudit = auditRobotsForPath(input.robotsTxt ?? null, pathname);
  const diffResult = diffDualDOM(rawHtml, hydratedHtml);
  const quotabilityResult = analyzeQuotability(rawHtml);
  const jsonLdResult = auditJsonLd(rawHtml);
  const ncsAuditSummary = input.ncsConfig ? auditNcsConstraints(input.ncsConfig) : undefined;

  const deductions: Deduction[] = [];
  const hardGatesTriggered: string[] = [];

  // Pillar 1: Robots Access (Weight 15%)
  const pillarRobotsDeductions: Deduction[] = [];
  const pillarRobotsPassed: string[] = [];

  if (robotsAudit.isAvailable) {
    if (!robotsAudit.allSearchBotsAllowed) {
      const blockedSearchBots = robotsAudit.botResults
        .filter((b) => b.category === 'search' && !b.allowed)
        .map((b) => b.botName);

      const lost = Math.min(100, blockedSearchBots.length * 30);
      const ded: Deduction = {
        ruleId: 'ROBOTS_SEARCHBOT_DISALLOW',
        pillar: 'robots',
        severity: 'critical',
        lostPoints: lost,
        title: 'AI Search Bots Disallowed in robots.txt',
        evidence: `Blocked search bots: ${blockedSearchBots.join(', ')} on path "${pathname}"`,
        exactFix: `Add "Allow: ${pathname}" or "User-agent: * Allow: /" in robots.txt for AI search indexers.`,
      };
      pillarRobotsDeductions.push(ded);
      deductions.push(ded);
    } else {
      pillarRobotsPassed.push('All major AI search bots (OAI-SearchBot, PerplexityBot, Claude-SearchBot) are permitted.');
    }
  } else {
    pillarRobotsPassed.push('No restrictive robots.txt found (default allow all per RFC 9309).');
  }

  const robotsScore = Math.max(
    0,
    100 - pillarRobotsDeductions.reduce((acc, d) => acc + d.lostPoints, 0)
  );

  // Pillar 2: Render Parity (Weight 25%)
  const pillarRenderDeductions: Deduction[] = [];
  const pillarRenderPassed: string[] = [];

  if (diffResult.isEmptyCsrShell) {
    hardGatesTriggered.push('EMPTY_CSR_SHELL');
    const ded: Deduction = {
      ruleId: 'EMPTY_CSR_SHELL',
      pillar: 'renderParity',
      severity: 'critical',
      lostPoints: 60,
      title: 'Empty Client-Side Render Shell Detected',
      evidence: `Initial raw HTML contains only ${diffResult.rawWordCount} words, while hydrated browser DOM contains ${diffResult.hydratedWordCount} words.`,
      exactFix: 'Switch page rendering to Server-Side Rendering (SSR) or Static Site Generation (SSG). AI search bots do not wait for JS bundles to execute.',
    };
    pillarRenderDeductions.push(ded);
    deductions.push(ded);
  }

  if (diffResult.hasSuspenseTraps) {
    const ded: Deduction = {
      ruleId: 'NEXTJS_SUSPENSE_TRAP',
      pillar: 'renderParity',
      severity: 'critical',
      lostPoints: Math.min(40, diffResult.suspenseTrapsCount * 15),
      title: 'Next.js App Router Streaming Suspense Trap',
      evidence: `Found ${diffResult.suspenseTrapsCount} unhydrated <div hidden id="S:..."> or <template id="B:..."> streaming fallbacks in initial HTML.`,
      exactFix: 'De-stream critical entity facts, pricing, and boundaries by hoisting them out of deferred Suspense boundaries into the root SSR layout.',
    };
    pillarRenderDeductions.push(ded);
    deductions.push(ded);
  }

  if (diffResult.numericTokenRecall < 0.8) {
    const lost = Math.round((1 - diffResult.numericTokenRecall) * 35);
    const ded: Deduction = {
      ruleId: 'NUMERIC_SPECS_OMITTED_IN_SSR',
      pillar: 'renderParity',
      severity: 'high',
      lostPoints: lost,
      title: 'Critical Prices & Numerical Specs Missing from Initial SSR',
      evidence: `Numeric/currency recall between raw HTML and browser DOM is ${(diffResult.numericTokenRecall * 100).toFixed(1)}%.`,
      exactFix: 'Render pricing and key numeric specifications directly in server HTML rather than fetching them via client-side useEffect/fetch.',
    };
    pillarRenderDeductions.push(ded);
    deductions.push(ded);
  }

  if (diffResult.blockRecall >= 0.9 && !diffResult.hasSuspenseTraps && !diffResult.isEmptyCsrShell) {
    pillarRenderPassed.push('Initial HTML contains >= 90% of final hydrated visible text.');
  }

  const renderParityScore = Math.max(
    0,
    100 - pillarRenderDeductions.reduce((acc, d) => acc + d.lostPoints, 0)
  );

  // Pillar 3: Quotability & Fact Density (Weight 15%)
  const pillarQuotabilityDeductions: Deduction[] = [];
  const pillarQuotabilityPassed: string[] = [];

  if (!quotabilityResult.hasUpperThirdDirectAnswer) {
    const ded: Deduction = {
      ruleId: 'MISSING_UPPER_THIRD_DIRECT_ANSWER',
      pillar: 'quotability',
      severity: 'high',
      lostPoints: 30,
      title: 'No Direct Answer Definition in Upper 30% of Page',
      evidence: 'The top 30% of visible text lacks a self-contained 40-60 word definition block with concrete factual claims.',
      exactFix: 'Add a concise, self-contained summary immediately below the H1 stating the entity name, primary capabilities, and key specifications.',
    };
    pillarQuotabilityDeductions.push(ded);
    deductions.push(ded);
  } else {
    pillarQuotabilityPassed.push('Self-contained definition block present in upper 30% of visible content.');
  }

  if (quotabilityResult.factToNoiseRatio < 0.4) {
    const ded: Deduction = {
      ruleId: 'HIGH_MARKETING_PUFFERY_NOISE',
      pillar: 'quotability',
      severity: 'medium',
      lostPoints: 20,
      title: 'High Marketing Puffery to Fact Ratio',
      evidence: `Fact-to-Noise ratio is ${(quotabilityResult.factToNoiseRatio * 100).toFixed(0)}%. Detected puffery buzzwords: ${quotabilityResult.detectedPuffery.slice(0, 5).join(', ')}`,
      exactFix: 'Replace subjective buzzwords ("revolutionary", "seamless") with verifiable numeric specs, certifications, and dimensions.',
    };
    pillarQuotabilityDeductions.push(ded);
    deductions.push(ded);
  }

  if (quotabilityResult.barePronounSentences.length > 2) {
    const ded: Deduction = {
      ruleId: 'BARE_PRONOUN_FRAGMENTATION',
      pillar: 'quotability',
      severity: 'medium',
      lostPoints: 15,
      title: 'Bare-Pronoun Openings Detected in Key Sentences',
      evidence: `Found ${quotabilityResult.barePronounSentences.length} sentences starting with bare pronouns ("It", "They", "We") that lose context when chunked by RAG embeddings.`,
      exactFix: 'Rewrite sentences to be subject-first, explicitly naming the brand or product (e.g. replace "It delivers 500W" with "The Garuda PowerHub delivers 500W").',
    };
    pillarQuotabilityDeductions.push(ded);
    deductions.push(ded);
  }

  const quotabilityScore = Math.max(
    0,
    100 - pillarQuotabilityDeductions.reduce((acc, d) => acc + d.lostPoints, 0)
  );

  // Pillar 4: JSON-LD Graph Integrity (Weight 15%)
  const pillarJsonLdDeductions: Deduction[] = [];
  const pillarJsonLdPassed: string[] = [];

  if (!jsonLdResult.hasJsonLd) {
    const ded: Deduction = {
      ruleId: 'NO_JSON_LD',
      pillar: 'jsonld',
      severity: 'critical',
      lostPoints: 50,
      title: 'No JSON-LD Structured Data Graph Found',
      evidence: 'No <script type="application/ld+json"> tag detected in raw HTML.',
      exactFix: 'Embed a valid schema.org @graph JSON-LD block containing Product and Organization schema.',
    };
    pillarJsonLdDeductions.push(ded);
    deductions.push(ded);
  } else {
    if (jsonLdResult.hasConflictingEntities) {
      const ded: Deduction = {
        ruleId: 'CONFLICTING_JSON_LD_ENTITIES',
        pillar: 'jsonld',
        severity: 'high',
        lostPoints: 25,
        title: 'Duplicate / Disjointed JSON-LD Entity Blocks Detected',
        evidence: `Multiple disconnected blocks found for types: ${jsonLdResult.duplicateTypes.join(', ')}`,
        exactFix: 'Unify disparate JSON-LD snippets into a single coordinated @graph with explicit @id cross-references.',
      };
      pillarJsonLdDeductions.push(ded);
      deductions.push(ded);
    }

    if (jsonLdResult.visibleParityScore < 80) {
      const ded: Deduction = {
        ruleId: 'JSON_LD_VISIBLE_PARITY_MISMATCH',
        pillar: 'jsonld',
        severity: 'high',
        lostPoints: Math.round((100 - jsonLdResult.visibleParityScore) * 0.4),
        title: 'Visible Parity Mismatch Between JSON-LD and HTML',
        evidence: `Visible parity score is ${jsonLdResult.visibleParityScore}%. ${jsonLdResult.parityIssues.length} attributes in JSON-LD were not found in visible text.`,
        exactFix: 'Ensure every price, offering name, and constraint listed in JSON-LD is visible to human users in the HTML markup.',
      };
      pillarJsonLdDeductions.push(ded);
      deductions.push(ded);
    } else {
      pillarJsonLdPassed.push('JSON-LD schema exhibits high parity with visible text.');
    }
  }

  const jsonLdScore = Math.max(
    0,
    100 - pillarJsonLdDeductions.reduce((acc, d) => acc + d.lostPoints, 0)
  );

  // Pillar 5: Entity Freshness & Corroboration (Weight 10%)
  const pillarFreshnessDeductions: Deduction[] = [];
  const pillarFreshnessPassed: string[] = [];

  if (!jsonLdResult.hasWikidataAuthority) {
    const ded: Deduction = {
      ruleId: 'MISSING_WIKIDATA_SAMEAS',
      pillar: 'entityFreshness',
      severity: 'medium',
      lostPoints: 25,
      title: 'Missing Wikidata Authority Corroboration in sameAs',
      evidence: 'No verified Wikidata Q-ID (https://www.wikidata.org/entity/Q...) linked in sameAs array.',
      exactFix: 'Add the canonical Wikidata entity URL to the sameAs field in your Organization/Brand JSON-LD schema.',
    };
    pillarFreshnessDeductions.push(ded);
    deductions.push(ded);
  } else {
    pillarFreshnessPassed.push(`Wikidata authority link verified: ${jsonLdResult.wikidataUrls.join(', ')}`);
  }

  if (!jsonLdResult.dateModifiedFreshness.present) {
    const ded: Deduction = {
      ruleId: 'MISSING_DATE_MODIFIED',
      pillar: 'entityFreshness',
      severity: 'low',
      lostPoints: 15,
      title: 'Missing dateModified Timestamp',
      evidence: 'No dateModified or asOf timestamp found in JSON-LD metadata.',
      exactFix: 'Include ISO 8601 "dateModified" in your JSON-LD to confirm freshness to AI retrieval algorithms.',
    };
    pillarFreshnessDeductions.push(ded);
    deductions.push(ded);
  } else if (!jsonLdResult.dateModifiedFreshness.isFresh) {
    const ded: Deduction = {
      ruleId: 'STALE_DATE_MODIFIED',
      pillar: 'entityFreshness',
      severity: 'medium',
      lostPoints: 20,
      title: 'Stale Entity Timestamp (> 365 Days Old)',
      evidence: `Last modified date was ${jsonLdResult.dateModifiedFreshness.date}, exceeding 1 year threshold.`,
      exactFix: 'Update the page dateModified timestamp to reflect current factual verification.',
    };
    pillarFreshnessDeductions.push(ded);
    deductions.push(ded);
  }

  const entityFreshnessScore = Math.max(
    0,
    100 - pillarFreshnessDeductions.reduce((acc, d) => acc + d.lostPoints, 0)
  );

  // Pillar 6: Negative Boundaries (NCS) (Weight 10%)
  const pillarNcsDeductions: Deduction[] = [];
  const pillarNcsPassed: string[] = [];

  if (!ncsAuditSummary || ncsAuditSummary.totalConstraints === 0) {
    // Check if raw HTML contains an inline NCS block
    const hasInlineNcs = /negative-constraint-schema|ncs:v1/i.test(rawHtml);
    if (!hasInlineNcs) {
      const ded: Deduction = {
        ruleId: 'MISSING_NEGATIVE_CONSTRAINTS',
        pillar: 'negativeBoundaries',
        severity: 'medium',
        lostPoints: 30,
        title: 'Missing Negative Constraint Schema (NCS)',
        evidence: 'No explicit negative boundaries declared. RAG agents frequently hallucinate missing features.',
        exactFix: 'Define facts.config.json with explicit negative constraints (e.g. "not waterproof", "does not support Linux") and compile it.',
      };
      pillarNcsDeductions.push(ded);
      deductions.push(ded);
    } else {
      pillarNcsPassed.push('Negative Constraint Schema markers detected inline.');
    }
  } else {
    if (ncsAuditSummary.hasExpiredConstraints) {
      hardGatesTriggered.push('EXPIRED_NCS_CONSTRAINTS');
      const ded: Deduction = {
        ruleId: 'EXPIRED_NCS_CONSTRAINTS',
        pillar: 'negativeBoundaries',
        severity: 'critical',
        lostPoints: 40,
        title: 'Expired Negative Constraints Detected in CI',
        evidence: `Expired constraints past reviewBy date: ${ncsAuditSummary.expiredConstraints.join(', ')}`,
        exactFix: 'Audit and renew the reviewBy date for these constraints or update documentation evidence.',
      };
      pillarNcsDeductions.push(ded);
      deductions.push(ded);
    } else {
      pillarNcsPassed.push(`All ${ncsAuditSummary.totalConstraints} negative constraints are active and verified.`);
    }
  }

  const negativeBoundariesScore = Math.max(
    0,
    100 - pillarNcsDeductions.reduce((acc, d) => acc + d.lostPoints, 0)
  );

  // Pillar 7: Continuity & WebMCP Readiness (Weight 10%)
  const pillarContinuityDeductions: Deduction[] = [];
  const pillarContinuityPassed: string[] = [];

  const hasWebMcpScript = /navigator\.modelContext|@agentlens\/runtime|brand-facts\.json/i.test(hydratedHtml);
  const hasAgentSectionMarkers = /data-agent-section/i.test(rawHtml);

  if (!hasWebMcpScript) {
    const ded: Deduction = {
      ruleId: 'MISSING_WEBMCP_OR_CONTINUITY_SCRIPT',
      pillar: 'continuity',
      severity: 'medium',
      lostPoints: 30,
      title: 'Missing Zero-CLS AI Continuity Bar or WebMCP Declarative Bridge',
      evidence: 'No WebMCP (navigator.modelContext) registration or AgentLens continuity script detected.',
      exactFix: 'Include the < 2.8KB @agentlens/runtime script to enable zero-CLS continuity and browser agent tool registration.',
    };
    pillarContinuityDeductions.push(ded);
    deductions.push(ded);
  } else {
    pillarContinuityPassed.push('WebMCP / AgentLens continuity hooks detected.');
  }

  if (!hasAgentSectionMarkers) {
    const ded: Deduction = {
      ruleId: 'MISSING_AGENT_SECTION_MARKERS',
      pillar: 'continuity',
      severity: 'low',
      lostPoints: 10,
      title: 'Missing [data-agent-section] Landing Anchors',
      evidence: 'No data-agent-section attributes found on major content sections.',
      exactFix: 'Add data-agent-section="pricing|specs|summary" attributes to facilitate deep linking from AI citations.',
    };
    pillarContinuityDeductions.push(ded);
    deductions.push(ded);
  } else {
    pillarContinuityPassed.push('Page markup contains [data-agent-section] deep anchor attributes.');
  }

  const continuityScore = Math.max(
    0,
    100 - pillarContinuityDeductions.reduce((acc, d) => acc + d.lostPoints, 0)
  );

  // Pillar Breakdown map
  const pillars: Record<PillarName, PillarScoreBreakdown> = {
    robots: {
      score: robotsScore,
      weight: 0.15,
      deductions: pillarRobotsDeductions,
      passedChecks: pillarRobotsPassed,
    },
    renderParity: {
      score: renderParityScore,
      weight: 0.25,
      deductions: pillarRenderDeductions,
      passedChecks: pillarRenderPassed,
    },
    quotability: {
      score: quotabilityScore,
      weight: 0.15,
      deductions: pillarQuotabilityDeductions,
      passedChecks: pillarQuotabilityPassed,
    },
    jsonld: {
      score: jsonLdScore,
      weight: 0.15,
      deductions: pillarJsonLdDeductions,
      passedChecks: pillarJsonLdPassed,
    },
    entityFreshness: {
      score: entityFreshnessScore,
      weight: 0.10,
      deductions: pillarFreshnessDeductions,
      passedChecks: pillarFreshnessPassed,
    },
    negativeBoundaries: {
      score: negativeBoundariesScore,
      weight: 0.10,
      deductions: pillarNcsDeductions,
      passedChecks: pillarNcsPassed,
    },
    continuity: {
      score: continuityScore,
      weight: 0.10,
      deductions: pillarContinuityDeductions,
      passedChecks: pillarContinuityPassed,
    },
  };

  // Compute Headline Scores
  // S_render is what full JS browser sees (ignores raw renderParity deficit)
  const weightedRenderScore =
    robotsScore * 0.15 +
    100 * 0.25 + // Full browser renders JS successfully
    quotabilityScore * 0.15 +
    jsonLdScore * 0.15 +
    entityFreshnessScore * 0.10 +
    negativeBoundariesScore * 0.10 +
    continuityScore * 0.10;

  let sRender = Math.round(weightedRenderScore);

  // S_fetch is what non-rendering crawlers see (heavily affected by renderParity and robots)
  const weightedFetchScore =
    robotsScore * 0.15 +
    renderParityScore * 0.25 +
    quotabilityScore * 0.15 +
    jsonLdScore * 0.15 +
    entityFreshnessScore * 0.10 +
    negativeBoundariesScore * 0.10 +
    continuityScore * 0.10;

  let sFetch = Math.round(weightedFetchScore);

  // Apply Hard Gates
  if (diffResult.isEmptyCsrShell) {
    sFetch = Math.min(sFetch, 40);
  }
  if (robotsAudit.isAvailable && !robotsAudit.allSearchBotsAllowed && robotsAudit.searchBotsBlockedCount >= 3) {
    sFetch = 0;
  }
  if (ncsAuditSummary?.hasExpiredConstraints) {
    sFetch = Math.min(sFetch, 65);
    sRender = Math.min(sRender, 65);
  }

  const blindnessGap = Math.max(0, sRender - sFetch);

  let status: 'pass' | 'warning' | 'fail' = 'pass';
  if (sFetch < 60 || hardGatesTriggered.length > 0) {
    status = 'fail';
  } else if (sFetch < 80) {
    status = 'warning';
  }

  const durationMs = Date.now() - startTime;

  return {
    targetUrl: input.targetUrl,
    auditedAt: new Date().toISOString(),
    durationMs,
    sFetch,
    sRender,
    blindnessGap,
    status,
    hardGatesTriggered,
    pillars,
    ghostElements: diffResult.ghostElements,
    deductions,
    ncsSummary: ncsAuditSummary,
  };
}
