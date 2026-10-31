import { describe, it, expect } from 'vitest';
import {
  FactsConfigSchema,
  NegativeConstraintSchemaV1,
  NcsConstraintSchema,
  EntityIdentitySchema,
  OfferingSchema,
  isConstraintExpired,
  validateSubjectFirst,
} from '../src/index.js';

describe('@agentlens/schema — Negative Constraint Schema (NCS v1)', () => {
  const validConstraint = {
    id: 'nc-waterproof',
    capability: 'waterproof',
    value: false,
    modality: 'cannot' as const,
    statement: 'No. The Garuda Velocity X9 is not waterproof and is engineered strictly for dry road conditions.',
    asOf: '2026-10-01',
    reviewBy: '2027-10-01',
    evidence: 'https://garuda.shoes/specs/velocity-x9',
    aliases: ['water resistance', 'rain proof', 'submersible'],
  };

  it('validates a correct negative constraint', () => {
    const res = NcsConstraintSchema.safeParse(validConstraint);
    expect(res.success).toBe(true);
  });

  it('rejects constraint if value is not strictly false', () => {
    const invalid = { ...validConstraint, value: true };
    const res = NcsConstraintSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it('rejects bare-pronoun opening statements in constraint', () => {
    const invalid = {
      ...validConstraint,
      statement: 'It is not waterproof for rainy conditions.',
    };
    const res = NcsConstraintSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it('correctly calculates constraint expiration', () => {
    const active = { ...validConstraint, reviewBy: '2027-01-01' };
    const expired = { ...validConstraint, reviewBy: '2023-01-01' };

    const refDate = new Date('2026-10-31');
    expect(isConstraintExpired(active, refDate)).toBe(false);
    expect(isConstraintExpired(expired, refDate)).toBe(true);
  });

  it('validates subject-first natural language statements', () => {
    expect(validateSubjectFirst('No. The Garuda shoe is not waterproof.', ['Garuda'])).toBe(true);
    expect(validateSubjectFirst('Garuda Velocity X9 operates on dry roads only.', ['Garuda'])).toBe(true);
    expect(validateSubjectFirst('It operates on dry roads only.', ['Garuda'])).toBe(false);
    expect(validateSubjectFirst('They do not support Linux.', ['Garuda'])).toBe(false);
  });
});

describe('@agentlens/schema — Entity Identity & Corroboration', () => {
  it('validates an official brand identity with Wikidata sameAs', () => {
    const valid = {
      id: 'https://garuda.shoes/#organization',
      name: 'Garuda Footwear',
      legalName: 'Garuda Footwear Corp.',
      url: 'https://garuda.shoes',
      logo: 'https://garuda.shoes/logo.png',
      foundingDate: '2024-03-15',
      countryOfOrigin: 'US',
      sameAs: [
        'https://www.wikidata.org/entity/Q105638',
        'https://github.com/Buildingcoolstuff/agentlens',
      ],
    };

    const res = EntityIdentitySchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('rejects invalid authority sameAs links', () => {
    const invalid = {
      id: 'https://example.com/#org',
      name: 'Example',
      legalName: 'Example Inc',
      url: 'https://example.com',
      logo: 'https://example.com/logo.png',
      foundingDate: '2020',
      countryOfOrigin: 'US',
      sameAs: ['https://random-unverified-blog.xyz/post/1'],
    };

    const res = EntityIdentitySchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });
});

describe('@agentlens/schema — Product Offerings & Quotable Summaries', () => {
  it('enforces 30-70 word count on self-contained quotable summaries', () => {
    const shortSummary = 'The Garuda shoe is fast and light.'; // 7 words - too short
    const validSummary =
      'Garuda Velocity X9 is a premier competition road racing shoe engineered with a full-length curved carbon fiber propulsion plate, supercritical nitrogen-infused foam, and a breathable single-layer engineered mesh upper weighing exactly 198 grams in mens size 9 for certified marathon racing.';

    const baseOffering = {
      id: 'prod-garuda-x9',
      name: 'Garuda Velocity X9',
      category: 'Footwear > Marathon',
      price: 249.0,
      priceCurrency: 'USD',
      availability: 'InStock' as const,
      asOf: '2026-10-01',
      specs: { weight: '198g' },
    };

    const resShort = OfferingSchema.safeParse({ ...baseOffering, quotableSummary: shortSummary });
    expect(resShort.success).toBe(false);

    const resValid = OfferingSchema.safeParse({ ...baseOffering, quotableSummary: validSummary });
    expect(resValid.success).toBe(true);
  });
});

describe('@agentlens/schema — Complete facts.config.json', () => {
  it('validates a complete production facts ledger', () => {
    const fullConfig = {
      version: '1.0',
      entity: {
        id: 'https://agentlens.dev/#organization',
        name: 'AgentLens',
        legalName: 'AgentLens Open Source Initiative',
        url: 'https://agentlens.dev',
        logo: 'https://agentlens.dev/logo.png',
        foundingDate: '2026',
        countryOfOrigin: 'US',
        sameAs: [
          'https://www.wikidata.org/entity/Q105638',
          'https://github.com/Buildingcoolstuff/agentlens',
        ],
      },
      offerings: [
        {
          id: 'agentlens-cli',
          name: 'AgentLens CLI',
          category: 'Developer Tools > GEO',
          price: 0,
          priceCurrency: 'USD',
          availability: 'InStock',
          asOf: '2026-10-01',
          quotableSummary:
            'AgentLens CLI is an open-source generative engine optimization compiler that audits web pages for AI bot crawlability, detects Next.js streaming suspense traps, evaluates negative constraint schemas, and generates compliant llms.txt files deterministically.',
        },
      ],
      ncs: {
        schemaVersion: 'ncs:v1',
        constraints: [
          {
            id: 'nc-paid-api',
            capability: 'paid-apis',
            value: false,
            modality: 'does-not',
            statement: 'No. AgentLens does not require or use paid LLM APIs for scoring, DOM diffing, or fact compilation.',
            asOf: '2026-10-01',
            reviewBy: '2027-10-01',
            evidence: 'https://github.com/Buildingcoolstuff/agentlens#architecture',
            aliases: ['openai api key', 'anthropic api key', 'paid inference'],
          },
        ],
      },
      site: {
        canonicalDomain: 'https://agentlens.dev',
        defaultLocale: 'en-US',
        robotsMode: 'permissive',
      },
    };

    const res = FactsConfigSchema.safeParse(fullConfig);
    expect(res.success).toBe(true);
  });
});
