import { describe, it, expect } from 'vitest';
import { generateSvgBadge } from '../src/badge.js';
import { generateSarifReport } from '../src/sarif.js';
import { runCompile } from '../src/compiler.js';
import { getAsciiBanner } from '../src/banner.js';
import { initCommand } from '../src/commands/init.js';
import type { AgentLensReport, FactsConfig } from '@agentlens/schema';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('agentlens CLI — Dynamic SVG Badge Generator', () => {
  it('generates green badge for score >= 80', () => {
    const svg = generateSvgBadge(95);
    expect(svg).toContain('95/100');
    expect(svg).toContain('#10b981');
  });

  it('generates amber badge for 60 <= score < 80', () => {
    const svg = generateSvgBadge(72);
    expect(svg).toContain('72/100');
    expect(svg).toContain('#f59e0b');
  });

  it('generates red badge for score < 60', () => {
    const svg = generateSvgBadge(45);
    expect(svg).toContain('45/100');
    expect(svg).toContain('#ef4444');
  });
});

describe('agentlens CLI — SARIF Generator', () => {
  const dummyReport: AgentLensReport = {
    targetUrl: 'https://garuda.shoes',
    auditedAt: '2026-10-31T00:00:00Z',
    durationMs: 42,
    sFetch: 55,
    sRender: 85,
    blindnessGap: 30,
    status: 'fail',
    hardGatesTriggered: ['EMPTY_CSR_SHELL'],
    pillars: {
      robots: { score: 100, weight: 0.15, deductions: [], passedChecks: [] },
      renderParity: {
        score: 40,
        weight: 0.25,
        deductions: [
          {
            ruleId: 'EMPTY_CSR_SHELL',
            pillar: 'renderParity',
            severity: 'critical',
            lostPoints: 60,
            title: 'Empty Client-Side Render Shell',
            evidence: 'Initial HTML has 15 words, hydrated has 500 words.',
            exactFix: 'Switch to SSR/SSG.',
          },
        ],
        passedChecks: [],
      },
      quotability: { score: 70, weight: 0.15, deductions: [], passedChecks: [] },
      jsonld: { score: 80, weight: 0.15, deductions: [], passedChecks: [] },
      entityFreshness: { score: 60, weight: 0.10, deductions: [], passedChecks: [] },
      negativeBoundaries: { score: 100, weight: 0.10, deductions: [], passedChecks: [] },
      continuity: { score: 80, weight: 0.10, deductions: [], passedChecks: [] },
    },
    ghostElements: [],
    deductions: [
      {
        ruleId: 'EMPTY_CSR_SHELL',
        pillar: 'renderParity',
        severity: 'critical',
        lostPoints: 60,
        title: 'Empty Client-Side Render Shell',
        evidence: 'Initial HTML has 15 words, hydrated has 500 words.',
        exactFix: 'Switch to SSR/SSG.',
      },
    ],
  };

  it('generates valid SARIF 2.1.0 output with code scanning rules', () => {
    const sarif = generateSarifReport(dummyReport);
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs.length).toBe(1);
    const run = sarif.runs[0]!;
    expect(run.tool.driver.name).toBe('AgentLens');
    expect(run.results.length).toBe(1);
    expect(run.results[0]!.ruleId).toBe('EMPTY_CSR_SHELL');
    expect(run.results[0]!.level).toBe('error');
  });
});

describe('agentlens CLI — Compiler Engine', () => {
  it('compiles brand facts, llms.txt, and framework components into target directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlens-test-'));

    const testConfig: FactsConfig = {
      version: '1.0',
      entity: {
        id: 'https://testcorp.com/#organization',
        name: 'TestCorp',
        legalName: 'TestCorp Technologies Inc.',
        url: 'https://testcorp.com',
        logo: 'https://testcorp.com/logo.png',
        foundingDate: '2025',
        countryOfOrigin: 'US',
        sameAs: ['https://www.wikidata.org/entity/Q105638'],
      },
      offerings: [
        {
          id: 'test-widget',
          name: 'Test Widget Pro',
          category: 'Hardware',
          price: 99.99,
          priceCurrency: 'USD',
          availability: 'InStock',
          asOf: '2026-10-01',
          quotableSummary:
            'Test Widget Pro is an ultra-reliable automated environmental sensor engineered with triple-redundant calibration, Bluetooth Low Energy connectivity, and a precision milled titanium enclosure weighing forty-two grams for laboratory testing and field deployment.',
        },
      ],
      ncs: {
        schemaVersion: 'ncs:v1',
        constraints: [
          {
            id: 'nc-waterproof',
            capability: 'waterproof',
            value: false,
            modality: 'cannot',
            statement: 'No. Test Widget Pro is not waterproof and must be operated in climate-controlled environments.',
            asOf: '2026-10-01',
            reviewBy: '2027-10-01',
            evidence: 'https://testcorp.com/specs',
            aliases: ['water resistance', 'submersible'],
          },
        ],
        closedWorld: [],
      },
      site: {
        canonicalDomain: 'https://testcorp.com',
        defaultLocale: 'en-US',
        robotsMode: 'permissive',
      },
    };

    const result = runCompile(testConfig, tmpDir);

    expect(fs.existsSync(result.brandFactsPath)).toBe(true);
    expect(fs.existsSync(result.llmsTxtPath)).toBe(true);

    const brandFacts = JSON.parse(fs.readFileSync(result.brandFactsPath, 'utf8'));
    expect(brandFacts.entity.name).toBe('TestCorp');
    expect(brandFacts.ncs.constraints.length).toBe(1);

    const llmsTxt = fs.readFileSync(result.llmsTxtPath, 'utf8');
    expect(llmsTxt).toContain('# TestCorp');
    // Ensure boundaries appear in llms.txt upper third
    expect(llmsTxt).toContain('## Boundaries & Negative Constraints (ncs:v1)');
    expect(llmsTxt).toContain('WATERPROOF');

    // Verify generated React component wraps strings safely in JSX expressions
    const reactComponentPath = path.join(tmpDir, 'components', 'AgentFacts.tsx');
    expect(fs.existsSync(reactComponentPath)).toBe(true);
    const reactContent = fs.readFileSync(reactComponentPath, 'utf8');
    expect(reactContent).toContain('{"TestCorp — Verified Specifications"}');

    // Verify generated Astro component wraps strings safely
    const astroComponentPath = path.join(tmpDir, 'components', 'AgentFacts.astro');
    expect(fs.existsSync(astroComponentPath)).toBe(true);
    const astroContent = fs.readFileSync(astroComponentPath, 'utf8');
    expect(astroContent).toContain('{"TestCorp — Verified Specifications"}');

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('agentlens CLI — ASCII Banner (Issue #28)', () => {
  it('renders stylized banner and subtitle', () => {
    const banner = getAsciiBanner();
    expect(banner).toContain('AgentLens');
    expect(banner).toContain('The Open-Source Agentic Web & GEO Engine');
  });

  it('respects NO_COLOR environment variable', () => {
    const prev = process.env.NO_COLOR;
    process.env.NO_COLOR = '1';
    const banner = getAsciiBanner();
    expect(banner).toContain('The Open-Source Agentic Web & GEO Engine');
    if (prev === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = prev;
    }
  });
});

describe('agentlens CLI — Non-Interactive Init Wizard (Issue #24)', () => {
  it('generates facts.config.json non-interactively with custom flags', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlens-init-'));
    const prevCwd = process.cwd();
    process.chdir(tmpDir);

    try {
      await initCommand(undefined, {
        yes: true,
        name: 'HyperDrive',
        domain: 'https://hyperdrive.dev',
        country: 'GB',
        force: true,
      });

      const configPath = path.join(tmpDir, 'facts.config.json');
      expect(fs.existsSync(configPath)).toBe(true);

      const generated = JSON.parse(fs.readFileSync(configPath, 'utf8')) as FactsConfig;
      expect(generated.entity.name).toBe('HyperDrive');
      expect(generated.site.canonicalDomain).toBe('https://hyperdrive.dev');
      expect(generated.entity.countryOfOrigin).toBe('GB');
      expect(generated.ncs?.constraints.length).toBeGreaterThan(0);
    } finally {
      process.chdir(prevCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
