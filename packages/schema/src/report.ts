import { z } from 'zod';

export const PillarNameSchema = z.enum([
  'robots',
  'renderParity',
  'quotability',
  'jsonld',
  'entityFreshness',
  'negativeBoundaries',
  'continuity',
]);

export type PillarName = z.infer<typeof PillarNameSchema>;

export const DeductionSeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export type DeductionSeverity = z.infer<typeof DeductionSeveritySchema>;

export const DeductionSchema = z.object({
  ruleId: z.string().min(1),
  pillar: PillarNameSchema,
  severity: DeductionSeveritySchema,
  lostPoints: z.number().nonnegative(),
  title: z.string(),
  evidence: z.string(),
  exactFix: z.string(),
});

export type Deduction = z.infer<typeof DeductionSchema>;

export const GhostElementSchema = z.object({
  selector: z.string(),
  text: z.string(),
  category: z.enum(['price', 'numeric', 'heading', 'jsonld', 'suspense-trap', 'spec', 'cta']),
  severity: DeductionSeveritySchema,
  reason: z.string(),
});

export type GhostElement = z.infer<typeof GhostElementSchema>;

export const PillarScoreBreakdownSchema = z.object({
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  deductions: z.array(DeductionSchema),
  passedChecks: z.array(z.string()),
});

export type PillarScoreBreakdown = z.infer<typeof PillarScoreBreakdownSchema>;

export const NcsAuditSummarySchema = z.object({
  totalConstraints: z.number().nonnegative(),
  expiredConstraints: z.array(z.string()),
  activeConstraints: z.number().nonnegative(),
  hasExpiredConstraints: z.boolean(),
  reviewStatus: z.enum(['valid', 'expired', 'warning']),
});

export type NcsAuditSummary = z.infer<typeof NcsAuditSummarySchema>;

export const AgentLensReportSchema = z.object({
  targetUrl: z.string().url(),
  auditedAt: z.string(),
  durationMs: z.number().nonnegative(),
  sFetch: z.number().min(0).max(100),
  sRender: z.number().min(0).max(100),
  blindnessGap: z.number(),
  status: z.enum(['pass', 'warning', 'fail']),
  hardGatesTriggered: z.array(z.string()),
  pillars: z.record(PillarNameSchema, PillarScoreBreakdownSchema),
  ghostElements: z.array(GhostElementSchema),
  deductions: z.array(DeductionSchema),
  ncsSummary: NcsAuditSummarySchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type AgentLensReport = z.infer<typeof AgentLensReportSchema>;
