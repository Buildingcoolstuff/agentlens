/**
 * Fact-to-Noise & Top-30% Quotability Analyzer (quotability.ts)
 *
 * Evaluates whether page text is engineered for Generative Engine Optimization (GEO)
 * and RAG retrieval splitters.
 *
 * Key criteria:
 *  - First 30% Direct Answer Density: Self-contained definition block in upper 30%
 *  - Fact Units (F) vs. Marketing Noise Units (N)
 *  - Bare-Pronoun Openings ("It features", "They offer") that break RAG chunk context
 */

import { extractVisibleText } from './differ.js';

export interface QuotabilityAnalysis {
  top30PercentScore: number; // 0 to 100
  hasUpperThirdDirectAnswer: boolean;
  first30WordCount: number;
  totalWordCount: number;
  factUnitsCount: number;
  noiseUnitsCount: number;
  factToNoiseRatio: number; // 0.0 to 1.0
  barePronounSentences: Array<{ sentence: string; pronoun: string }>;
  detectedFacts: string[];
  detectedPuffery: string[];
  h1EntityNamedInUpperThird: boolean;
  quotableSentencesCount: number;
}

// Marketing puffery noise lexicon
export const PUFFERY_LEXICON = new Set([
  'revolutionary',
  'world-class',
  'worldclass',
  'seamless',
  'seamlessly',
  'game-changing',
  'gamechanging',
  'disruptive',
  'best-in-class',
  'bestinclass',
  'cutting-edge',
  'cuttingedge',
  'unrivaled',
  'next-generation',
  'nextgeneration',
  'state-of-the-art',
  'stateoftheart',
  'effortless',
  'supercharge',
  'magical',
  'magic',
  'synergy',
  'paradigm',
  'holistic',
  'groundbreaking',
  'unmatched',
  'ultra',
  'miracle',
  'ultimate',
  'unparalleled',
  'gamechanger',
  'innovative',
]);

// Claim and factual assertion verbs
const FACT_VERBS = [
  'engineered',
  'manufactured',
  'certified',
  'guaranteed',
  'supports',
  'requires',
  'includes',
  'weighs',
  'delivers',
  'measures',
  'composed',
  'designed',
  'operates',
  'priced',
  'launched',
  'compatible',
];

const NUMERIC_FACT_REGEX = /\b\d+(?:\.\d+)?\s*(?:kg|g|lbs|oz|km|miles|mph|fps|ms|sec|min|hours|gb|tb|mb|mah|wh|v|w|cm|mm|m|%|hz|khz|ghz|k|x)\b/gi;
const CURRENCY_REGEX = /(?:[\$₹€£¥]\s*\d+(?:[.,]\d+)?|\b\d+(?:[.,]\d+)?\s*(?:usd|eur|inr|gbp)\b)/gi;
const ISO_DATE_REGEX = /\b(?:\d{4}-\d{2}-\d{2}|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4})\b/gi;
const NCS_BOUNDARY_REGEX = /\b(?:cannot|does not|will not|not for|not available|not compatible|not affiliated|discontinued|dry road only|water resistant only)\b/gi;

// Non-global regex predicates for idempotent sentence tests (avoids RegExp.lastIndex state mutation)
const testNumericFact = (s: string) => /\b\d+(?:\.\d+)?\s*(?:kg|g|lbs|oz|km|miles|mph|fps|ms|sec|min|hours|gb|tb|mb|mah|wh|v|w|cm|mm|m|%|hz|khz|ghz|k|x)\b/i.test(s);
const testCurrency = (s: string) => /(?:[\$₹€£¥]\s*\d+(?:[.,]\d+)?|\b\d+(?:[.,]\d+)?\s*(?:usd|eur|inr|gbp)\b)/i.test(s);
const testIsoDate = (s: string) => /\b(?:\d{4}-\d{2}-\d{2}|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4})\b/i.test(s);
const testNcsBoundary = (s: string) => /\b(?:cannot|does not|will not|not for|not available|not compatible|not affiliated|discontinued|dry road only|water resistant only)\b/i.test(s);

const BARE_PRONOUN_STARTERS = /^(it|they|we|this|these|those|its|their|he|she)\b/i;

/**
 * Splits text into sentences cleanly.
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+(?=[A-Z0-9"'])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
}

/**
 * Extracts H1 text from HTML.
 */
export function extractH1(html: string): string | null {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return h1Match && h1Match[1] ? extractVisibleText(h1Match[1]) : null;
}

/**
 * Analyzes fact density, top-30% quotability, and pronoun fragmentation.
 */
export function analyzeQuotability(html: string): QuotabilityAnalysis {
  const fullText = extractVisibleText(html);
  const words = fullText.split(/\s+/).filter(Boolean);
  const totalWordCount = words.length;

  if (totalWordCount === 0) {
    return {
      top30PercentScore: 0,
      hasUpperThirdDirectAnswer: false,
      first30WordCount: 0,
      totalWordCount: 0,
      factUnitsCount: 0,
      noiseUnitsCount: 0,
      factToNoiseRatio: 0,
      barePronounSentences: [],
      detectedFacts: [],
      detectedPuffery: [],
      h1EntityNamedInUpperThird: false,
      quotableSentencesCount: 0,
    };
  }

  // 1. First 30% upper-third slice
  const cutoffIndex = Math.max(40, Math.floor(words.length * 0.3));
  const first30Words = words.slice(0, cutoffIndex);
  const first30Text = first30Words.join(' ');

  const h1 = extractH1(html);
  let h1EntityNamedInUpperThird = false;
  if (h1) {
    const h1Keywords = h1.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const upperThirdLower = first30Text.toLowerCase();
    h1EntityNamedInUpperThird = h1Keywords.some((kw) => upperThirdLower.includes(kw));
  } else {
    // If no H1, consider true if brand/subject capitalized
    h1EntityNamedInUpperThird = /^[A-Z][a-zA-Z0-9]+/.test(first30Text);
  }

  // 2. Fact Extraction
  const detectedFacts: string[] = [];
  const numFacts = fullText.match(NUMERIC_FACT_REGEX) || [];
  const currFacts = fullText.match(CURRENCY_REGEX) || [];
  const dateFacts = fullText.match(ISO_DATE_REGEX) || [];
  const ncsFacts = fullText.match(NCS_BOUNDARY_REGEX) || [];

  detectedFacts.push(...numFacts.slice(0, 15));
  detectedFacts.push(...currFacts.slice(0, 10));
  detectedFacts.push(...dateFacts.slice(0, 5));
  detectedFacts.push(...ncsFacts.slice(0, 5));

  // Check fact verbs
  const sentences = splitSentences(fullText);
  let factVerbsCount = 0;
  for (const s of sentences) {
    const lower = s.toLowerCase();
    for (const v of FACT_VERBS) {
      if (lower.includes(v)) {
        factVerbsCount++;
        break;
      }
    }
  }

  const factUnitsCount = detectedFacts.length + factVerbsCount;

  // 3. Marketing Puffery Noise
  const detectedPuffery: string[] = [];
  for (const w of words) {
    const cleanWord = w.toLowerCase().replace(/[^a-z]/g, '');
    if (PUFFERY_LEXICON.has(cleanWord)) {
      detectedPuffery.push(cleanWord);
    }
  }
  const noiseUnitsCount = detectedPuffery.length;

  const factToNoiseRatio =
    factUnitsCount + noiseUnitsCount > 0
      ? factUnitsCount / (factUnitsCount + noiseUnitsCount)
      : 1.0;

  // 4. Bare Pronoun Detection
  const barePronounSentences: Array<{ sentence: string; pronoun: string }> = [];
  for (const sentence of sentences) {
    const match = sentence.match(BARE_PRONOUN_STARTERS);
    if (match && match[1]) {
      barePronounSentences.push({
        sentence: sentence.slice(0, 100),
        pronoun: match[1],
      });
    }
  }

  // 5. Upper-Third Direct Answer Density Check
  // Looking for a self-contained 40-60 word definition block in the first 30%
  const first30Sentences = splitSentences(first30Text);
  let hasUpperThirdDirectAnswer = false;
  let quotableSentencesCount = 0;

  for (const s of first30Sentences) {
    const wordCount = s.split(/\s+/).length;
    const hasFacts =
      testNumericFact(s) ||
      testCurrency(s) ||
      testIsoDate(s) ||
      testNcsBoundary(s);
    const noPronoun = !BARE_PRONOUN_STARTERS.test(s);

    if (wordCount >= 20 && wordCount <= 70 && hasFacts && noPronoun) {
      hasUpperThirdDirectAnswer = true;
      quotableSentencesCount++;
    }
  }

  // Top-30% Score calculation
  let top30Score = 40; // baseline
  if (h1EntityNamedInUpperThird) top30Score += 25;
  if (hasUpperThirdDirectAnswer) top30Score += 35;
  if (first30Sentences.length > 0 && BARE_PRONOUN_STARTERS.test(first30Sentences[0] || '')) {
    top30Score = Math.max(0, top30Score - 20);
  }

  return {
    top30PercentScore: Math.min(100, Math.max(0, top30Score)),
    hasUpperThirdDirectAnswer,
    first30WordCount: first30Words.length,
    totalWordCount,
    factUnitsCount,
    noiseUnitsCount,
    factToNoiseRatio,
    barePronounSentences: barePronounSentences.slice(0, 10),
    detectedFacts,
    detectedPuffery: Array.from(new Set(detectedPuffery)).slice(0, 10),
    h1EntityNamedInUpperThird,
    quotableSentencesCount,
  };
}
