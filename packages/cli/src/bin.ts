#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { compileCommand } from './commands/compile.js';
import { auditCommand } from './commands/audit.js';

const program = new Command();

program
  .name('agentlens')
  .description('The Open-Source Agentic Web & GEO Engine — Audit in the Browser, Compile in the Build, Orient at the Edge.')
  .version('1.0.0');

program
  .command('init [target]')
  .description('Initialize facts.config.json by querying the public Wikidata SPARQL / Search API')
  .action(async (target?: string) => {
    await initCommand(target);
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
  .action(async (url: string, opts: { sarif?: boolean; threshold?: string; badge?: boolean }) => {
    await auditCommand(url, opts);
  });

program
  .command('sarif <url>')
  .description('Run audit and output SARIF v2.1.0 file directly')
  .action(async (url: string) => {
    await auditCommand(url, { sarif: true });
  });

program.parse(process.argv);
