/**
 * SARIF v2.1.0 Exporter (sarif.ts)
 *
 * Emits GitHub Actions compliant Static Analysis Results Interchange Format (SARIF)
 * annotations for CI/CD pipelines and the GitHub Code Scanning tab.
 */

import type { AgentLensReport, Deduction } from '@agentlens/schema';

export interface SarifLog {
  $schema: string;
  version: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: Array<{
          id: string;
          name: string;
          shortDescription: { text: string };
          fullDescription: { text: string };
          helpUri: string;
          defaultConfiguration: {
            level: 'error' | 'warning' | 'note';
          };
        }>;
      };
    };
    results: Array<{
      ruleId: string;
      level: 'error' | 'warning' | 'note';
      message: { text: string };
      locations?: Array<{
        physicalLocation: {
          artifactLocation: { uri: string };
          region?: { startLine: number };
        };
      }>;
      properties?: Record<string, unknown>;
    }>;
  }>;
}

function mapSeverityToSarifLevel(sev: Deduction['severity']): 'error' | 'warning' | 'note' {
  switch (sev) {
    case 'critical':
      return 'error';
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
    case 'info':
    default:
      return 'note';
  }
}

export function generateSarifReport(report: AgentLensReport): SarifLog {
  const rulesMap = new Map<string, { id: string; title: string; exactFix: string; level: 'error' | 'warning' | 'note' }>();

  for (const d of report.deductions) {
    if (!rulesMap.has(d.ruleId)) {
      rulesMap.set(d.ruleId, {
        id: d.ruleId,
        title: d.title,
        exactFix: d.exactFix,
        level: mapSeverityToSarifLevel(d.severity),
      });
    }
  }

  const sarifRules = Array.from(rulesMap.values()).map((r) => ({
    id: r.id,
    name: r.id,
    shortDescription: { text: r.title },
    fullDescription: { text: `${r.title}. Recommended Fix: ${r.exactFix}` },
    helpUri: `https://agentlens.dev/rules/${r.id.toLowerCase()}`,
    defaultConfiguration: {
      level: r.level,
    },
  }));

  const sarifResults = report.deductions.map((d) => ({
    ruleId: d.ruleId,
    level: mapSeverityToSarifLevel(d.severity),
    message: {
      text: `[Pillar: ${d.pillar}] ${d.title} (Lost ${d.lostPoints} pts).\nEvidence: ${d.evidence}\nFix: ${d.exactFix}`,
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: report.targetUrl },
        },
      },
    ],
    properties: {
      lostPoints: d.lostPoints,
      pillar: d.pillar,
    },
  }));

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'AgentLens',
            version: '1.0.0',
            informationUri: 'https://github.com/Buildingcoolstuff/agentlens',
            rules: sarifRules,
          },
        },
        results: sarifResults,
      },
    ],
  };
}
