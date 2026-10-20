import { z } from 'zod';

export const AvailabilitySchema = z.enum([
  'InStock',
  'OutOfStock',
  'PreOrder',
  'Discontinued',
  'LimitedAvailability',
]);

export type Availability = z.infer<typeof AvailabilitySchema>;

export const BARE_PRONOUNS = new Set([
  'it', 'they', 'we', 'this', 'he', 'she', 'these', 'those', 'its', 'their', 'our', 'you',
]);

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function startsWithBarePronoun(text: string): boolean {
  const firstWord = text.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
  return firstWord ? BARE_PRONOUNS.has(firstWord) : false;
}

export const QuotableSummarySchema = z
  .string()
  .refine((text) => {
    const words = countWords(text);
    return words >= 30 && words <= 70;
  }, {
    message: 'Quotable summary should be a self-contained 40-60 word definition block (allowed range 30-70 words for RAG chunk stability)',
  })
  .refine((text) => !startsWithBarePronoun(text), {
    message: 'Quotable summary must be subject-first and cannot begin with bare pronouns ("It", "They", "We", "This") that lose context in RAG splitters',
  });

export const OfferingSchema = z.object({
  id: z.string().min(1, 'Offering ID is required (e.g. prod-garuda-velocity-x9)'),
  name: z.string().min(1, 'Product or offering name is required'),
  category: z.string().min(1, 'Category is required (e.g. Footwear > Running)'),
  price: z.number().nonnegative('Price cannot be negative'),
  priceCurrency: z.string().length(3, 'Currency must be an ISO 4217 3-letter currency code (e.g. USD, INR, EUR)'),
  availability: AvailabilitySchema,
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/, 'asOf must be an ISO 8601 date or datetime'),
  quotableSummary: QuotableSummarySchema,
  specs: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
  url: z.string().url().optional(),
  image: z.string().url().optional(),
});

export type Offering = z.infer<typeof OfferingSchema>;
