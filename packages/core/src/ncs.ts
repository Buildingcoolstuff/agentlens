/**
 * Deterministic Negative Constraint Guard (ncs.ts)
 *
 * Enforces explicit non-capabilities, forbidden claims, and closed-world
 * boundaries defined in facts.config.json (ncs:v1).
 *
 * Zero hallucination, zero LLM variance: purely deterministic keyword,
 * polarity, alias, and closed-world set membership matching.
 */

import type {
  NcsConstraint,
  NcsClosedWorld,
  NegativeConstraintSchemaV1Type,
  NcsAuditSummary,
} from '@agentlens/schema';
import { isConstraintExpired } from '@agentlens/schema';

export type ClaimVerificationStatus = 'supported' | 'contradicted' | 'unknown';

export interface ClaimVerificationResult {
  status: ClaimVerificationStatus;
  claim: string;
  matchedConstraint?: NcsConstraint;
  matchedClosedWorld?: NcsClosedWorld;
  reason: string;
  confidence: number; // 1.0 for deterministic rule matches
}

/**
 * Checks an array of NCS constraints for expired reviewBy dates.
 */
export function auditNcsConstraints(
  ncs: NegativeConstraintSchemaV1Type,
  referenceDate: Date = new Date()
): NcsAuditSummary {
  const expired: string[] = [];

  for (const c of ncs.constraints) {
    if (isConstraintExpired(c, referenceDate)) {
      expired.push(c.id);
    }
  }

  const activeCount = ncs.constraints.length - expired.length;
  const hasExpired = expired.length > 0;

  return {
    totalConstraints: ncs.constraints.length,
    expiredConstraints: expired,
    activeConstraints: activeCount,
    hasExpiredConstraints: hasExpired,
    reviewStatus: hasExpired ? 'expired' : 'valid',
  };
}

/**
 * Verifies an arbitrary natural language claim string deterministically
 * against the declared Negative Constraints and Closed World boundaries.
 */
export function verifyClaimAgainstNcs(
  claim: string,
  ncs: NegativeConstraintSchemaV1Type
): ClaimVerificationResult {
  const normClaim = claim.toLowerCase().trim();

  // 1. Check Negative Constraints
  for (const constraint of ncs.constraints) {
    const terms = [constraint.capability.toLowerCase(), ...constraint.aliases.map((a) => a.toLowerCase())];

    for (const term of terms) {
      if (normClaim.includes(term)) {
        // Check if the claim is asserting this capability affirmatively or inquiring about it
        // If the claim asserts the forbidden feature (e.g., "is waterproof", "supports waterproof", "has waterproof")
        const isAssertingAffirmative =
          !normClaim.includes('not ' + term) &&
          !normClaim.includes('no ' + term) &&
          !normClaim.includes('cannot ' + term) &&
          !normClaim.includes('does not ' + term) &&
          !normClaim.includes('never ' + term);

        if (isAssertingAffirmative) {
          return {
            status: 'contradicted',
            claim,
            matchedConstraint: constraint,
            reason: `Claim contradicts negative constraint [${constraint.id}]: "${constraint.statement}". Evidence: ${constraint.evidence}`,
            confidence: 1.0,
          };
        } else {
          // If the claim is affirming the boundary (e.g., "is not waterproof"), it is supported!
          return {
            status: 'supported',
            claim,
            matchedConstraint: constraint,
            reason: `Claim correctly reflects negative constraint [${constraint.id}]: "${constraint.statement}"`,
            confidence: 1.0,
          };
        }
      }
    }
  }

  // 2. Check Closed World Declarations
  for (const cw of ncs.closedWorld) {
    const normalizedMembers = cw.members.map((m) => m.toLowerCase());
    const classLower = cw.class.toLowerCase();

    // If the claim mentions the class (e.g. "operating system" or "supported formats")
    if (normClaim.includes(classLower)) {
      // Check if any member is present
      const foundMember = normalizedMembers.some((m) => normClaim.includes(m));
      if (!foundMember) {
        return {
          status: 'contradicted',
          claim,
          matchedClosedWorld: cw,
          reason: `Exhaustive closed world [${cw.class}] strictly permits only: [${cw.members.join(', ')}].`,
          confidence: 1.0,
        };
      }
    }
  }

  return {
    status: 'unknown',
    claim,
    reason: 'Claim does not match any known negative constraint boundaries or closed-world sets.',
    confidence: 0.5,
  };
}
