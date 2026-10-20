import { z } from 'zod';

export const NcsModalitySchema = z.enum([
  'cannot',
  'does-not',
  'will-not',
  'not-for',
  'not-available',
  'not-compatible',
  'not-affiliated',
  'discontinued',
]);

export type NcsModality = z.infer<typeof NcsModalitySchema>;

export const NcsConstraintSchema = z.object({
  id: z.string().min(1, 'Constraint ID is required (e.g. nc-waterproof)'),
  capability: z.string().min(1, 'Capability identifier is required (e.g. waterproof)'),
  value: z.literal(false, {
    errorMap: () => ({ message: 'Negative constraints must explicitly set value to false' }),
  }),
  modality: NcsModalitySchema,
  statement: z
    .string()
    .min(10, 'Statement must be a clear natural language sentence')
    .refine((s) => {
      // Must be subject-first or polarity-first (e.g., "No. The Garuda...")
      return !/^(it|they|we|this|you)\b/i.test(s.trim());
    }, {
      message: 'Statement must be subject-first or polarity-first; avoid bare pronouns',
    }),
  scope: z.string().optional(),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'asOf must be an ISO 8601 date (YYYY-MM-DD)'),
  reviewBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'reviewBy must be a valid ISO 8601 expiry date (YYYY-MM-DD)'),
  evidence: z.string().url('Evidence must be a valid URL to official documentation or specification'),
  aliases: z.array(z.string().min(1)).min(1, 'At least one alias or search synonym is required'),
});

export type NcsConstraint = z.infer<typeof NcsConstraintSchema>;

export const NcsClosedWorldSchema = z.object({
  class: z.string().min(1, 'Closed world class name is required (e.g. Supported Platforms)'),
  exhaustive: z.literal(true, {
    errorMap: () => ({ message: 'Closed-world declaration must be explicitly exhaustive: true' }),
  }),
  members: z.array(z.string().min(1)).min(1, 'Closed-world set must contain at least one member'),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'asOf must be an ISO 8601 date (YYYY-MM-DD)'),
});

export type NcsClosedWorld = z.infer<typeof NcsClosedWorldSchema>;

export const NegativeConstraintSchemaV1 = z.object({
  schemaVersion: z.literal('ncs:v1').default('ncs:v1'),
  constraints: z.array(NcsConstraintSchema).min(1, 'At least one negative constraint boundary is required'),
  closedWorld: z.array(NcsClosedWorldSchema).default([]),
});

export type NegativeConstraintSchemaV1Type = z.infer<typeof NegativeConstraintSchemaV1>;
