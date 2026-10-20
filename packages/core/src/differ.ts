/**
 * Dual-DOM Hydration Blindspot Engine (differ.ts)
 *
 * Compares raw initial HTML (what non-rendering AI bots see) with
 * hydrated HTML (what browser-based users see).
 *
 * Detects:
 *  - Next.js App Router Streaming Suspense Traps (<div hidden id="S:...">, <template id="B:...">)
 *  - Ghost Elements (prices, headings, specs present in hydrated DOM but missing in raw HTML)
 *  - 3-Gram Shingle Jaccard Similarity and Numeric/Currency Token Recall
 */

import type { GhostElement, DeductionSeverity } from '@agentlens/schema';

export interface HydrationDiffResult {
  rawWordCount: number;
  hydratedWordCount: number;
  blockRecall: number; // 0.0 to 1.0 (weighted recall of visible text)
  jaccardSimilarity: number; // 0.0 to 1.0 (3-gram shingle overlap)
  numericTokenRecall: number; // 0.0 to 1.0
  ghostElements: GhostElement[];
  suspenseTrapsCount: number;
  hasSuspenseTraps: boolean;
  isEmptyCsrShell: boolean;
  mainContainerSelector: string;
}

// Regex for stripping non-content tags
const STRIP_TAGS_REGEX = /<(script|style|svg|noscript|iframe)[^>]*>[\s\S]*?<\/\1>/gi;
const HTML_COMMENT_REGEX = /<!--[\s\S]*?-->/g;
const HTML_TAG_REGEX = /<[^>]+>/g;

// Currency symbols and numerical formats
const CURRENCY_OR_NUMERIC_REGEX = /(?:[\$₹€£¥]\s*\d+(?:[.,]\d+)?|\b\d+(?:[.,]\d+)?\s*(?:%|kg|g|lbs|oz|km|miles|mph|fps|ms|sec|min|hours|gb|tb|mb|mah|wh|v|w|cm|mm|m)\b)/gi;

// Next.js App Router streaming markers
const NEXTJS_SUSPENSE_DIV_REGEX = /<div\s+hidden\s+id="S:([^"]+)"[^>]*>([\s\S]*?)<\/div>/gi;
const NEXTJS_SUSPENSE_TEMPLATE_REGEX = /<template\s+id="B:([^"]+)"[^>]*>([\s\S]*?)<\/template>/gi;

/**
 * Strips script, style, comments, and HTML tags to yield clean normalized text.
 */
export function extractVisibleText(html: string): string {
  const clean = html
    .replace(STRIP_TAGS_REGEX, ' ')
    .replace(HTML_COMMENT_REGEX, ' ')
    .replace(HTML_TAG_REGEX, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return clean;
}

/**
 * Isolates the primary content container (<main>, [role="main"], <article>, or highest density container).
 */
export function extractMainContent(html: string): { content: string; selector: string } {
  // Try <main>
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch && mainMatch[1]) {
    return { content: mainMatch[1], selector: 'main' };
  }

  // Try role="main"
  const roleMatch = html.match(/<([a-z0-9-]+)[^>]*role=["']main["'][^>]*>([\s\S]*?)<\/\1>/i);
  if (roleMatch && roleMatch[2]) {
    return { content: roleMatch[2], selector: `${roleMatch[1]}[role="main"]` };
  }

  // Try <article>
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch && articleMatch[1]) {
    return { content: articleMatch[1], selector: 'article' };
  }

  // Fallback to <body>
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    return { content: bodyMatch[1], selector: 'body' };
  }

  return { content: html, selector: 'html' };
}

/**
 * Tokenizes text into lowercase alphanumeric words.
 */
export function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9₹$€£¥%.-]+/)
    .filter((w) => w.length > 1);
}

/**
 * Extracts 3-gram shingles from word tokens.
 */
export function create3Grams(tokens: string[]): Set<string> {
  const shingles = new Set<string>();
  for (let i = 0; i <= tokens.length - 3; i++) {
    const shingle = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
    shingles.add(shingle);
  }
  return shingles;
}

/**
 * Computes Jaccard Similarity between two sets of shingles.
 */
export function computeJaccard(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionSize++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize > 0 ? intersectionSize / unionSize : 0.0;
}

interface ElementTagInfo {
  tag: string;
  id?: string;
  className?: string;
  text: string;
  fullTag: string;
}

/**
 * Lightweight pure-TS tag and element extractor for DOM elements.
 */
function extractElements(html: string): ElementTagInfo[] {
  const results: ElementTagInfo[] = [];
  const elementRegex = /<([a-z1-6]+)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = elementRegex.exec(html)) !== null) {
    const tag = match[1]!.toLowerCase();
    const attrs = match[2] || '';
    const inner = match[3] || '';

    // Ignore scripts, styles, etc.
    if (['script', 'style', 'svg', 'noscript', 'head', 'html'].includes(tag)) {
      continue;
    }

    const idMatch = attrs.match(/id=["']([^"']+)["']/i);
    const classMatch = attrs.match(/class=["']([^"']+)["']/i);

    const cleanText = extractVisibleText(inner);
    if (cleanText.length > 0) {
      results.push({
        tag,
        id: idMatch ? idMatch[1] : undefined,
        className: classMatch ? classMatch[1] : undefined,
        text: cleanText,
        fullTag: match[0],
      });
    }
  }

  return results;
}

function buildCssSelector(el: ElementTagInfo): string {
  if (el.id) return `#${el.id}`;
  if (el.className) {
    const firstClass = el.className.trim().split(/\s+/)[0];
    if (firstClass && !firstClass.includes(':')) {
      return `${el.tag}.${firstClass}`;
    }
  }
  return el.tag;
}

/**
 * Dual-DOM Differ Core
 */
export function diffDualDOM(rawHtml: string, hydratedHtml: string): HydrationDiffResult {
  const rawMain = extractMainContent(rawHtml);
  const hydratedMain = extractMainContent(hydratedHtml);

  const rawText = extractVisibleText(rawMain.content);
  const hydratedText = extractVisibleText(hydratedMain.content);

  const rawTokens = tokenizeWords(rawText);
  const hydratedTokens = tokenizeWords(hydratedText);

  const rawSet = new Set(rawTokens);

  // 1. Shingle Jaccard
  const rawShingles = create3Grams(rawTokens);
  const hydratedShingles = create3Grams(hydratedTokens);
  const jaccard = computeJaccard(rawShingles, hydratedShingles);

  // 2. Weighted Word Token Recall
  let matchedTokens = 0;
  for (const token of hydratedTokens) {
    if (rawSet.has(token)) {
      matchedTokens++;
    }
  }
  const blockRecall = hydratedTokens.length > 0 ? matchedTokens / hydratedTokens.length : 1.0;

  // 3. Numeric & Currency Token Recall
  const rawNumericMatches = rawHtml.match(CURRENCY_OR_NUMERIC_REGEX) || [];
  const hydratedNumericMatches = hydratedHtml.match(CURRENCY_OR_NUMERIC_REGEX) || [];

  const rawNumericSet = new Set(rawNumericMatches.map((m) => m.toLowerCase().replace(/\s+/g, '')));
  let matchedNumeric = 0;
  for (const match of hydratedNumericMatches) {
    const norm = match.toLowerCase().replace(/\s+/g, '');
    if (rawNumericSet.has(norm)) {
      matchedNumeric++;
    }
  }
  const numericTokenRecall =
    hydratedNumericMatches.length > 0 ? matchedNumeric / hydratedNumericMatches.length : 1.0;

  // 4. Next.js App Router Suspense Traps detection
  const ghostElements: GhostElement[] = [];
  let suspenseTrapsCount = 0;

  let suspenseMatch: RegExpExecArray | null;
  const rawHtmlCopy = rawHtml;
  while ((suspenseMatch = NEXTJS_SUSPENSE_DIV_REGEX.exec(rawHtmlCopy)) !== null) {
    suspenseTrapsCount++;
    const trapId = suspenseMatch[1];
    const trappedContent = extractVisibleText(suspenseMatch[2] || '');
    if (trappedContent.length > 0) {
      ghostElements.push({
        selector: `div[hidden][id="S:${trapId}"]`,
        text: trappedContent.slice(0, 120),
        category: 'suspense-trap',
        severity: 'critical',
        reason: `Content trapped in Next.js streaming hidden div id="S:${trapId}". Non-rendering AI bots discard hidden elements.`,
      });
    }
  }

  let templateMatch: RegExpExecArray | null;
  while ((templateMatch = NEXTJS_SUSPENSE_TEMPLATE_REGEX.exec(rawHtmlCopy)) !== null) {
    suspenseTrapsCount++;
    const templateId = templateMatch[1];
    ghostElements.push({
      selector: `template[id="B:${templateId}"]`,
      text: `Streaming fallback template id="B:${templateId}"`,
      category: 'suspense-trap',
      severity: 'high',
      reason: `Unhydrated Next.js streaming template fallback. Crawlers without JS execution cannot unpack template tags.`,
    });
  }

  // 5. Extract Ghost Elements from hydrated DOM that are missing in raw HTML
  const hydratedElements = extractElements(hydratedMain.content);

  for (const el of hydratedElements) {
    const snippet = el.text.slice(0, 100);
    // If the text snippet is missing from raw HTML
    if (!rawHtml.includes(el.text) && !rawText.includes(snippet)) {
      const selector = buildCssSelector(el);

      // Check category
      let category: GhostElement['category'] = 'spec';
      let severity: DeductionSeverity = 'medium';

      if (CURRENCY_OR_NUMERIC_REGEX.test(el.text)) {
        category = 'price';
        severity = 'critical';
      } else if (['h1', 'h2', 'h3'].includes(el.tag)) {
        category = 'heading';
        severity = 'high';
      } else if (['button', 'a'].includes(el.tag)) {
        category = 'cta';
        severity = 'medium';
      }

      // Avoid duplicates with same selector and text
      if (!ghostElements.some((g) => g.selector === selector && g.text === snippet)) {
        ghostElements.push({
          selector,
          text: snippet,
          category,
          severity,
          reason: `Element exists in hydrated browser DOM but was omitted from the initial SSR HTML stream.`,
        });
      }
    }
  }

  // Check for Empty CSR Shell condition
  // e.g. raw words < 120 while hydrated >= 300
  const isEmptyCsrShell = rawTokens.length < 120 && hydratedTokens.length >= 300;

  return {
    rawWordCount: rawTokens.length,
    hydratedWordCount: hydratedTokens.length,
    blockRecall: Math.max(0, Math.min(1, blockRecall)),
    jaccardSimilarity: Math.max(0, Math.min(1, jaccard)),
    numericTokenRecall: Math.max(0, Math.min(1, numericTokenRecall)),
    ghostElements: ghostElements.slice(0, 50), // Cap at 50 most relevant ghosts
    suspenseTrapsCount,
    hasSuspenseTraps: suspenseTrapsCount > 0,
    isEmptyCsrShell,
    mainContainerSelector: hydratedMain.selector,
  };
}
