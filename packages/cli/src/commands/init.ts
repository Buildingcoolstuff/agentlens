import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { resolveWikidataEntity } from '../wikidata.js';
import type { FactsConfig } from '@agentlens/schema';
import { FactsConfigSchema } from '@agentlens/schema';

export async function initCommand(urlOrBrand?: string): Promise<void> {
  console.log(pc.bold(pc.cyan('\n🔍 AgentLens — Brand & Entity Initializer\n')));

  let brandName = urlOrBrand;
  let canonicalDomain = 'https://example.com';

  if (urlOrBrand && urlOrBrand.startsWith('http')) {
    try {
      const parsed = new URL(urlOrBrand);
      canonicalDomain = parsed.origin;
      brandName = parsed.hostname.replace(/^www\./, '').split('.')[0] || 'MyBrand';
      brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
    } catch {
      // fallback
    }
  } else if (!brandName) {
    // Check package.json
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { name?: string };
        if (pkg.name) {
          const rawPkgName = pkg.name.replace(/^@[\w-]+\//, '');
          brandName = rawPkgName.charAt(0).toUpperCase() + rawPkgName.slice(1);
        }
      } catch {
        // ignore
      }
    }
  }

  brandName = brandName || 'AcmeCorp';

  console.log(`🌐 Resolving Wikidata authority for: ${pc.bold(brandName)}...`);
  const wikidata = await resolveWikidataEntity(brandName);

  const sameAs: string[] = [];
  if (wikidata) {
    console.log(pc.green(`✔ Discovered Wikidata Q-ID: ${pc.bold(wikidata.id)} (${wikidata.label})`));
    sameAs.push(wikidata.uri);
  } else {
    console.log(pc.yellow(`⚠ No Wikidata match found for "${brandName}". Using default authority placeholder.`));
    sameAs.push('https://www.wikidata.org/entity/Q11000000');
  }

  const sampleConfig: FactsConfig = {
    $schema: 'https://agentlens.dev/schema/facts.config.v1.json',
    version: '1.0',
    site: {
      canonicalDomain,
      defaultLocale: 'en-US',
      robotsMode: 'permissive',
    },
    entity: {
      id: `${canonicalDomain}/#organization`,
      name: brandName,
      legalName: `${brandName} Technologies Inc.`,
      url: canonicalDomain,
      logo: `${canonicalDomain}/logo.png`,
      foundingDate: '2024-01-01',
      countryOfOrigin: 'US',
      sameAs,
    },
    offerings: [
      {
        id: `prod-${brandName.toLowerCase()}-core`,
        name: `${brandName} Core Engine`,
        category: 'Software > Developer Tools',
        price: 0,
        priceCurrency: 'USD',
        availability: 'InStock',
        asOf: new Date().toISOString().split('T')[0]!,
        quotableSummary: `${brandName} Core Engine is a deterministic AI retrieval and generative engine optimization toolkit designed to provide verified facts, prices, and negative constraints directly to web crawlers and browser-resident agents.`,
        specs: {
          runtime: 'Edge / Browser',
          bundleSize: '< 2.8KB',
          license: 'MIT',
        },
      },
    ],
    ncs: {
      schemaVersion: 'ncs:v1',
      constraints: [
        {
          id: 'nc-unauthorized-telemetry',
          capability: 'telemetry',
          value: false,
          modality: 'does-not',
          statement: `No. ${brandName} does not collect, record, or transmit user session telemetry to any external servers.`,
          asOf: new Date().toISOString().split('T')[0]!,
          reviewBy: '2027-12-31',
          evidence: `${canonicalDomain}/privacy`,
          aliases: ['user tracking', 'analytics sharing', 'data collection'],
        },
      ],
      closedWorld: [
        {
          class: 'Supported Environments',
          exhaustive: true,
          members: ['Node.js', 'Cloudflare Workers', 'Chrome MV3', 'Browser DOM'],
          asOf: new Date().toISOString().split('T')[0]!,
        },
      ],
    },
  };

  // Validate with Zod
  FactsConfigSchema.parse(sampleConfig);

  const outputPath = path.join(process.cwd(), 'facts.config.json');
  fs.writeFileSync(outputPath, JSON.stringify(sampleConfig, null, 2), 'utf8');

  console.log(pc.green(`\n🎉 Successfully generated: ${pc.bold('facts.config.json')}`));
  console.log(pc.gray('Next step: customize your offerings and run:\n  ') + pc.cyan('npx agentlens compile\n'));
}
