import { z } from 'zod';

export const WIKIDATA_URI_REGEX = /^https:\/\/www\.wikidata\.org\/entity\/Q\d+$/;
export const WIKIPEDIA_URI_REGEX = /^https:\/\/[a-z]{2,3}\.wikipedia\.org\/wiki\/.+$/;

export const ReplacesEntitySchema = z.object({
  previousName: z.string().min(1, 'Previous name cannot be empty'),
  retiredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be an ISO 8601 date (YYYY-MM-DD)'),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
  disambiguationNotice: z.string().min(10, 'Notice must be at least 10 characters explaining historical identity transition'),
});

export type ReplacesEntity = z.infer<typeof ReplacesEntitySchema>;

export const SameAsUrlSchema = z.string().url('Must be a valid URL').refine((val) => {
  return (
    WIKIDATA_URI_REGEX.test(val) ||
    WIKIPEDIA_URI_REGEX.test(val) ||
    val.includes('crunchbase.com') ||
    val.includes('github.com') ||
    val.includes('linkedin.com') ||
    val.includes('x.com') ||
    val.includes('twitter.com') ||
    val.includes('youtube.com') ||
    val.includes('facebook.com') ||
    val.includes('instagram.com')
  );
}, {
  message: 'Authority URL must be a recognized entity registry (Wikidata, Wikipedia, Crunchbase, GitHub, or official social profile)',
});

export const EntityIdentitySchema = z.object({
  id: z.string().url('id must be a canonical URI (e.g. https://example.com/#organization)'),
  name: z.string().min(1, 'Entity name is required'),
  legalName: z.string().min(1, 'Legal name is required'),
  url: z.string().url('Official URL is required'),
  logo: z.string().url('Logo URL is required'),
  foundingDate: z.string().regex(/^\d{4}(-\d{2}-\d{2})?$/, 'Founding date must be YYYY or YYYY-MM-DD'),
  countryOfOrigin: z.string().length(2, 'Country of origin must be an ISO 3166-1 alpha-2 code (e.g. US, IN, GB)'),
  sameAs: z.array(SameAsUrlSchema).min(1, 'At least one verified authority sameAs link (e.g., Wikidata or Wikipedia) is required for corroboration'),
  replacesEntity: ReplacesEntitySchema.optional(),
});

export type EntityIdentity = z.infer<typeof EntityIdentitySchema>;
