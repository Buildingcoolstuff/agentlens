import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { FactsConfigSchema } from '@agentlens/schema';
import { runCompile } from '../compiler.js';

export async function compileCommand(options: { cwd?: string } = {}): Promise<void> {
  const baseDir = options.cwd || process.cwd();
  const configPath = path.join(baseDir, 'facts.config.json');

  if (!fs.existsSync(configPath)) {
    console.error(pc.red(`✖ Error: facts.config.json not found in ${baseDir}`));
    console.error(pc.yellow('Run `npx agentlens init` to scaffold your configuration.'));
    process.exit(1);
  }

  let rawConfig: unknown;
  try {
    rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error(pc.red(`✖ Failed to parse JSON in ${configPath}: ${String(err)}`));
    process.exit(1);
  }

  const parsed = FactsConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    console.error(pc.red('✖ Schema validation failed for facts.config.json:'));
    for (const issue of parsed.error.issues) {
      console.error(pc.red(`  - [${issue.path.join('.')}]: ${issue.message}`));
    }
    process.exit(1);
  }

  console.log(pc.bold(pc.cyan('\n⚙ Compiling AgentLens Artifacts & Boundaries...\n')));

  try {
    const result = runCompile(parsed.data, baseDir);

    console.log(pc.green(`✔ Canonical Brand Facts: ${pc.bold(path.relative(baseDir, result.brandFactsPath))}`));
    console.log(pc.green(`✔ Prioritized llms.txt:   ${pc.bold(path.relative(baseDir, result.llmsTxtPath))}`));
    console.log(pc.green(`✔ Git Commit Timestamp:  ${pc.bold(result.gitTimestamp)}`));

    console.log(pc.cyan('\nSynchronized Framework Components:'));
    for (const file of result.generatedFiles) {
      if (file !== result.brandFactsPath && file !== result.llmsTxtPath) {
        console.log(`  - ${pc.bold(path.relative(baseDir, file))}`);
      }
    }

    console.log(pc.bold(pc.green('\n✨ Build compilation complete with 100% visible parity.\n')));
  } catch (err) {
    console.error(pc.red(`✖ Compilation error: ${String(err)}`));
    process.exit(1);
  }
}
