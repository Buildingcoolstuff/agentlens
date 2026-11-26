#!/usr/bin/env node
import { Command } from 'commander';
import { getAsciiBanner } from './banner.js';
import { initCommand, type InitCommandOptions } from './commands/init.js';
import { compileCommand } from './commands/compile.js';
import { auditCommand } from './commands/audit.js';

const program = new Command();

program
  .name('agentlens')
  .description('The Open-Source Agentic Web & GEO Engine — Audit in the Browser, Compile in the Build, Orient at the Edge.')
  .version('1.0.0')
  .addHelpText('before', () => getAsciiBanner());

program
  .command('init [target]')
  .description('Initialize facts.config.json by querying the public Wikidata SPARQL / Search API')
  .option('-y, --yes', 'Non-interactive mode with automatic defaults', false)
  .option('--name <brand>', 'Explicit brand or organization entity name')
  .option('--domain <url>', 'Canonical website domain (e.g. https://example.com)')
  .option('--country <code2>', 'Country of origin ISO alpha-2 code (e.g. US, IN, GB)')
  .option('--force', 'Overwrite existing facts.config.json without warning', false)
  .action(async (target?: string, opts?: InitCommandOptions) => {
    await initCommand(target, opts);
  });

program
  .command('compile')
  .description('Compile facts.config.json into public/.well-known/brand-facts.json, llms.txt, and framework components')
  .action(async () => {
    await compileCommand();
  });

program
  .command('audit <url>')
  .description('Audit a URL for AI crawler readiness, render parity, and negative constraint integrity')
  .option('--sarif', 'Emit GitHub Actions SARIF v2.1.0 log')
  .option('--threshold <score>', 'Minimum S_fetch score required for CI exit 0 (default: 80)', '80')
  .option('--badge', 'Generate dynamic SVG shield badge', true)
  .option('--render', 'Launch headless browser to capture hydrated DOM and evaluate true blindness gap', false)
  .action(async (url: string, opts: { sarif?: boolean; threshold?: string; badge?: boolean; render?: boolean }) => {
    await auditCommand(url, opts);
  });

program
  .command('sarif <url>')
  .description('Run audit and output SARIF v2.1.0 file directly')
  .action(async (url: string) => {
    await auditCommand(url, { sarif: true });
  });

program.parse(process.argv);
