import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { auditAndScore } from '@agentlens/core';
import type { FactsConfig } from '@agentlens/schema';
import { generateSarifReport } from '../sarif.js';
import { generateSvgBadge } from '../badge.js';

export interface AuditCommandOptions {
  sarif?: boolean;
  threshold?: string;
  badge?: boolean;
}

export async function auditCommand(urlOrPath: string, options: AuditCommandOptions): Promise<void> {
  const threshold = options.threshold ? parseInt(options.threshold, 10) : 80;

  console.log(pc.bold(pc.cyan(`\n🔍 AgentLens — Auditing Target: ${pc.underline(urlOrPath)}\n`)));

  let rawHtml = '';
  let robotsTxt: string | null = null;
  let targetUrl = urlOrPath;

  const localFilePath = path.resolve(process.cwd(), urlOrPath);
  const isLocalFile = fs.existsSync(localFilePath) && fs.statSync(localFilePath).isFile();

  if (isLocalFile) {
    try {
      rawHtml = fs.readFileSync(localFilePath, 'utf8');
      targetUrl = `file://${localFilePath.replace(/\\/g, '/')}`;
      console.log(pc.gray(`  Loaded local HTML file (${rawHtml.length} bytes)`));

      // Check for local robots.txt in same directory, public/, or project root
      const candidateRobots = [
        path.join(path.dirname(localFilePath), 'robots.txt'),
        path.join(process.cwd(), 'public', 'robots.txt'),
        path.join(process.cwd(), 'robots.txt'),
      ];
      for (const rPath of candidateRobots) {
        if (fs.existsSync(rPath) && fs.statSync(rPath).isFile()) {
          robotsTxt = fs.readFileSync(rPath, 'utf8');
          console.log(pc.gray(`  Loaded local robots.txt from: ${path.relative(process.cwd(), rPath)}`));
          break;
        }
      }
    } catch (err) {
      console.error(pc.red(`✖ Failed to read local file: ${String(err)}`));
      process.exit(1);
    }
  } else {
    // Remote HTTP / HTTPS URL
    try {
      const res = await fetch(urlOrPath, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AgentLens-AuditBot/1.0; +https://agentlens.dev)',
          'Cache-Control': 'no-cache, no-store',
        },
      });

      if (!res.ok) {
        console.error(pc.red(`✖ Failed to fetch URL: HTTP ${res.status} ${res.statusText}`));
        process.exit(1);
      }

      rawHtml = await res.text();
    } catch (err) {
      console.error(pc.red(`✖ Network fetch error: ${String(err)}`));
      process.exit(1);
    }

    // Fetch robots.txt
    try {
      const urlObj = new URL(urlOrPath);
      const robotsRes = await fetch(`${urlObj.origin}/robots.txt`, {
        headers: { 'User-Agent': 'AgentLens-AuditBot/1.0' },
      });
      if (robotsRes.ok) {
        robotsTxt = await robotsRes.text();
      }
    } catch {
      // robots.txt fetch optional
    }
  }

  // Load local facts.config.json if in same directory
  let ncsConfig: FactsConfig['ncs'] | undefined;
  const localConfigPath = path.join(process.cwd(), 'facts.config.json');
  if (fs.existsSync(localConfigPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(localConfigPath, 'utf8')) as FactsConfig;
      if (cfg.ncs) ncsConfig = cfg.ncs;
    } catch {
      // ignore
    }
  }

  // Execute deterministic scorer
  const report = auditAndScore({
    targetUrl,
    rawHtml,
    hydratedHtml: rawHtml, // CLI performs initial fetch inspection
    robotsTxt,
    ncsConfig,
  });

  // Print Header Scores
  const fetchBadge =
    report.sFetch >= 80 ? pc.bgGreen(pc.black(` S_fetch: ${report.sFetch}/100 `)) :
    report.sFetch >= 60 ? pc.bgYellow(pc.black(` S_fetch: ${report.sFetch}/100 `)) :
    pc.bgRed(pc.white(` S_fetch: ${report.sFetch}/100 `));

  const renderBadge = pc.bgBlue(pc.white(` S_render: ${report.sRender}/100 `));
  const gapBadge = report.blindnessGap > 15 ? pc.red(`Crawler Blindness Gap: ${report.blindnessGap} pts`) : pc.green(`Blindness Gap: ${report.blindnessGap} pts`);

  console.log(`  ${fetchBadge}  ${renderBadge}  [ ${gapBadge} ]\n`);

  // Print 7-Pillar Breakdown
  console.log(pc.bold('📊 7-Pillar Diagnostic Breakdown:'));
  console.log('─'.repeat(64));

  for (const [pillar, data] of Object.entries(report.pillars)) {
    const colorFn = data.score >= 80 ? pc.green : data.score >= 60 ? pc.yellow : pc.red;
    const bar = '█'.repeat(Math.floor(data.score / 10)).padEnd(10, '░');
    console.log(
      `  ${pillar.padEnd(20)} [${bar}] ${colorFn(String(data.score).padStart(3))}/100  (${Math.round(data.weight * 100)}% wt)`
    );
  }
  console.log('─'.repeat(64));

  // Print Deductions
  if (report.deductions.length > 0) {
    console.log(pc.bold(pc.yellow(`\n⚠ Detected Deductions & Actionable Fixes (${report.deductions.length}):`)));
    for (const d of report.deductions) {
      const sevColor = d.severity === 'critical' ? pc.red : d.severity === 'high' ? pc.magenta : pc.yellow;
      console.log(`\n  ${sevColor(`[${d.severity.toUpperCase()}]`)} ${pc.bold(d.title)} (-${d.lostPoints} pts)`);
      console.log(`    ${pc.gray('Rule ID:')}  ${d.ruleId}`);
      console.log(`    ${pc.gray('Evidence:')} ${d.evidence}`);
      console.log(`    ${pc.green('Exact Fix:')} ${d.exactFix}`);
    }
  }

  // Hard Gates
  if (report.hardGatesTriggered.length > 0) {
    console.log(pc.bold(pc.red(`\n🛑 Hard Gates Triggered: ${report.hardGatesTriggered.join(', ')}`)));
  }

  // Generate SVG Badge
  const svgBadge = generateSvgBadge(report.sFetch);
  fs.writeFileSync(path.join(process.cwd(), 'agentlens-badge.svg'), svgBadge, 'utf8');
  console.log(pc.gray(`\n✔ Dynamic SVG README badge saved to: agentlens-badge.svg`));

  // SARIF Output
  if (options.sarif) {
    const sarif = generateSarifReport(report);
    const sarifPath = path.join(process.cwd(), 'agentlens.sarif');
    fs.writeFileSync(sarifPath, JSON.stringify(sarif, null, 2), 'utf8');
    console.log(pc.green(`✔ GitHub Actions SARIF log exported to: ${sarifPath}`));
  }

  console.log('\n' + '─'.repeat(64));

  // Check CI Fail threshold
  if (report.sFetch < threshold || report.hardGatesTriggered.length > 0) {
    console.error(pc.red(`✖ CI Audit FAILED: S_fetch (${report.sFetch}) is below required threshold (${threshold}).\n`));
    process.exit(1);
  } else {
    console.log(pc.green(`✔ CI Audit PASSED: S_fetch (${report.sFetch}) meets threshold (${threshold}).\n`));
  }
}
