export * from './identity.js';
export * from './offerings.js';
export * from './ncs.js';
export * from './config.js';
export * from './report.js';

import type { NcsConstraint } from './ncs.js';

/**
 * Validates whether an NCS constraint has expired past its reviewBy date.
 * Expired constraints must fail CI builds.
 */
export function isConstraintExpired(constraint: NcsConstraint, referenceDate: Date = new Date()): boolean {
  const expiry = new Date(constraint.reviewBy);
  return expiry.getTime() < referenceDate.getTime();
}

/**
 * Validates that a natural language statement adheres to polarity-first or subject-first principles.
 */
export function validateSubjectFirst(statement: string, brandOrProductNames: string[] = []): boolean {
  const trimmed = statement.trim();
  // Polarity check: e.g. "No. The Garuda..."
  if (/^(no|never|none|not)\b/i.test(trimmed)) {
    return true;
  }
  // Named entity match
  for (const name of brandOrProductNames) {
    if (trimmed.toLowerCase().startsWith(name.toLowerCase())) {
      return true;
    }
  }
  // Check that it doesn't start with bare pronouns
  return !/^(it|they|we|this|you|he|she)\b/i.test(trimmed);
}
