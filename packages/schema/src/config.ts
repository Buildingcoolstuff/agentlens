import { z } from 'zod';
import { EntityIdentitySchema } from './identity.js';
import { OfferingSchema } from './offerings.js';
import { NegativeConstraintSchemaV1 } from './ncs.js';

export const FactsConfigSchema = z.object({
  $schema: z.string().optional(),
  version: z.literal('1.0').default('1.0'),
  entity: EntityIdentitySchema,
  offerings: z.array(OfferingSchema).min(1, 'At least one product or offering must be configured'),
  ncs: NegativeConstraintSchemaV1,
  site: z.object({
    canonicalDomain: z.string().min(1, 'Canonical domain is required (e.g. https://garuda.shoes)'),
    defaultLocale: z.string().default('en-US'),
    robotsMode: z.enum(['strict', 'permissive']).default('permissive'),
  }),
});

export type FactsConfig = z.infer<typeof FactsConfigSchema>;
