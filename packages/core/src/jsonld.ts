/**
 * JSON-LD Graph & Entity Integrity Validator (jsonld.ts)
 *
 * Validates:
 *  - Duplicate / conflicting @type Product or Organization blocks (Shopify/WP trap)
 *  - @id reference integrity and sameAs external authority links (Wikidata Q-IDs)
 *  - dateModified freshness
 *  - Visible Parity: every price, product name, rating, and constraint in JSON-LD
 *    must exist verbatim in visible raw HTML
 */

import { extractVisibleText } from './differ.js';
import { WIKIDATA_URI_REGEX } from '@agentlens/schema';

export interface JsonLdNode {
  type: string;
  id?: string;
  name?: string;
  price?: string | number;
  priceCurrency?: string;
  ratingValue?: string | number;
  dateModified?: string;
  sameAs?: string[];
  rawObject: Record<string, unknown>;
}

export interface JsonLdParityIssue {
  field: string;
  expectedValue: string;
  presentInVisibleHtml: boolean;
  selectorSnippet?: string;
}

export interface JsonLdAuditResult {
  hasJsonLd: boolean;
  scriptCount: number;
  nodes: JsonLdNode[];
  duplicateTypes: string[];
  hasConflictingEntities: boolean;
  hasWikidataAuthority: boolean;
  wikidataUrls: string[];
  dateModifiedFreshness: {
    present: boolean;
    date?: string;
    isFresh: boolean; // within 365 days
    isFuture: boolean;
  };
  visibleParityScore: number; // 0 to 100
  parityIssues: JsonLdParityIssue[];
  syntaxErrors: string[];
}

const JSONLD_SCRIPT_REGEX = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * Parses all JSON-LD scripts from HTML. Handles both single objects and @graph arrays.
 */
export function extractJsonLdBlocks(html: string): { nodes: JsonLdNode[]; syntaxErrors: string[]; count: number } {
  const nodes: JsonLdNode[] = [];
  const syntaxErrors: string[] = [];
  let match: RegExpExecArray | null;
  let count = 0;

  while ((match = JSONLD_SCRIPT_REGEX.exec(html)) !== null) {
    count++;
    const rawContent = match[1]?.trim() || '';
    if (!rawContent) continue;

    try {
      const parsed = JSON.parse(rawContent);
      flattenJsonLd(parsed, nodes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      syntaxErrors.push(`Failed to parse JSON-LD block #${count}: ${msg}`);
    }
  }

  return { nodes, syntaxErrors, count };
}

function flattenJsonLd(item: unknown, out: JsonLdNode[]): void {
  if (!item || typeof item !== 'object') return;

  if (Array.isArray(item)) {
    for (const el of item) {
      flattenJsonLd(el, out);
    }
    return;
  }

  const obj = item as Record<string, unknown>;

  if (obj['@graph'] && Array.isArray(obj['@graph'])) {
    for (const g of obj['@graph']) {
      flattenJsonLd(g, out);
    }
    return;
  }

  const rawType = obj['@type'];
  if (rawType) {
    const typeStr = Array.isArray(rawType) ? rawType.join(', ') : String(rawType);

    // Extract potential price
    let price: string | number | undefined;
    let priceCurrency: string | undefined;

    if (obj['offers']) {
      const offers = Array.isArray(obj['offers']) ? obj['offers'][0] : obj['offers'];
      if (offers && typeof offers === 'object') {
        const off = offers as Record<string, unknown>;
        if (off['price']) price = off['price'] as string | number;
        if (off['priceCurrency']) priceCurrency = String(off['priceCurrency']);
      }
    } else if (obj['price']) {
      price = obj['price'] as string | number;
      if (obj['priceCurrency']) priceCurrency = String(obj['priceCurrency']);
    }

    // Extract rating
    let ratingValue: string | number | undefined;
    if (obj['aggregateRating'] && typeof obj['aggregateRating'] === 'object') {
      const agg = obj['aggregateRating'] as Record<string, unknown>;
      if (agg['ratingValue']) ratingValue = agg['ratingValue'] as string | number;
    }

    // Extract sameAs
    const sameAsArr: string[] = [];
    if (Array.isArray(obj['sameAs'])) {
      for (const s of obj['sameAs']) {
        if (typeof s === 'string') sameAsArr.push(s);
      }
    } else if (typeof obj['sameAs'] === 'string') {
      sameAsArr.push(obj['sameAs']);
    }

    out.push({
      type: typeStr,
      id: typeof obj['@id'] === 'string' ? obj['@id'] : undefined,
      name: typeof obj['name'] === 'string' ? obj['name'] : undefined,
      price,
      priceCurrency,
      ratingValue,
      dateModified: typeof obj['dateModified'] === 'string' ? obj['dateModified'] : undefined,
      sameAs: sameAsArr,
      rawObject: obj,
    });
  }
}

/**
 * Audits JSON-LD blocks against raw HTML visible content to verify entity integrity & visible parity.
 */
export function auditJsonLd(rawHtml: string): JsonLdAuditResult {
  const visibleText = extractVisibleText(rawHtml).toLowerCase();
  const { nodes, syntaxErrors, count } = extractJsonLdBlocks(rawHtml);

  if (count === 0 || nodes.length === 0) {
    return {
      hasJsonLd: false,
      scriptCount: count,
      nodes: [],
      duplicateTypes: [],
      hasConflictingEntities: false,
      hasWikidataAuthority: false,
      wikidataUrls: [],
      dateModifiedFreshness: { present: false, isFresh: false, isFuture: false },
      visibleParityScore: 0,
      parityIssues: [{
        field: 'JSON-LD Graph',
        expectedValue: 'Valid schema.org application/ld+json metadata',
        presentInVisibleHtml: false,
      }],
      syntaxErrors,
    };
  }

  // Detect duplicate / conflicting core types
  const typeOccurrences: Record<string, number> = {};
  const duplicateTypes: string[] = [];
  const wikidataUrls: string[] = [];
  let foundDateModified: string | undefined;

  for (const node of nodes) {
    const key = node.type.toLowerCase();
    typeOccurrences[key] = (typeOccurrences[key] || 0) + 1;

    // Check sameAs for Wikidata
    if (node.sameAs) {
      for (const url of node.sameAs) {
        if (WIKIDATA_URI_REGEX.test(url)) {
          wikidataUrls.push(url);
        }
      }
    }

    if (node.dateModified && !foundDateModified) {
      foundDateModified = node.dateModified;
    }
  }

  // Conflict if multiple distinct Products or Organizations exist uncoordinated
  for (const [t, cnt] of Object.entries(typeOccurrences)) {
    if (cnt > 1 && (t.includes('product') || t.includes('organization'))) {
      duplicateTypes.push(t);
    }
  }

  // dateModified freshness
  let isFresh = false;
  let isFuture = false;
  if (foundDateModified) {
    const modTime = new Date(foundDateModified).getTime();
    const nowTime = Date.now();
    const oneYearAgo = nowTime - 365 * 24 * 3600 * 1000;

    if (!isNaN(modTime)) {
      if (modTime > nowTime + 24 * 3600 * 1000) {
        isFuture = true;
      } else if (modTime >= oneYearAgo) {
        isFresh = true;
      }
    }
  }

  // Visible Parity Check
  const parityIssues: JsonLdParityIssue[] = [];
  let parityChecksTotal = 0;
  let parityChecksPassed = 0;

  for (const node of nodes) {
    // 1. Check Product / Org Name
    if (node.name) {
      parityChecksTotal++;
      const nameNorm = node.name.toLowerCase().trim();
      if (visibleText.includes(nameNorm)) {
        parityChecksPassed++;
      } else {
        parityIssues.push({
          field: `${node.type}.name`,
          expectedValue: node.name,
          presentInVisibleHtml: false,
        });
      }
    }

    // 2. Check Price
    if (node.price !== undefined && node.price !== null) {
      parityChecksTotal++;
      const priceStr = String(node.price).trim();
      const rawPriceFound =
        visibleText.includes(priceStr) ||
        (node.priceCurrency && visibleText.includes(`${priceStr} ${node.priceCurrency.toLowerCase()}`));

      if (rawPriceFound) {
        parityChecksPassed++;
      } else {
        parityIssues.push({
          field: `${node.type}.price`,
          expectedValue: `${node.priceCurrency || ''} ${priceStr}`.trim(),
          presentInVisibleHtml: false,
        });
      }
    }

    // 3. Check Rating
    if (node.ratingValue !== undefined && node.ratingValue !== null) {
      parityChecksTotal++;
      const ratingStr = String(node.ratingValue).trim();
      if (visibleText.includes(ratingStr)) {
        parityChecksPassed++;
      } else {
        parityIssues.push({
          field: `${node.type}.ratingValue`,
          expectedValue: ratingStr,
          presentInVisibleHtml: false,
        });
      }
    }
  }

  const visibleParityScore =
    parityChecksTotal > 0 ? Math.round((parityChecksPassed / parityChecksTotal) * 100) : 100;

  return {
    hasJsonLd: true,
    scriptCount: count,
    nodes,
    duplicateTypes,
    hasConflictingEntities: duplicateTypes.length > 0,
    hasWikidataAuthority: wikidataUrls.length > 0,
    wikidataUrls,
    dateModifiedFreshness: {
      present: !!foundDateModified,
      date: foundDateModified,
      isFresh,
      isFuture,
    },
    visibleParityScore,
    parityIssues,
    syntaxErrors,
  };
}
