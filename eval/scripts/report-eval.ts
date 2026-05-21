#!/usr/bin/env tsx
/**
 * report-eval.ts — Markdown report generator
 *
 * Usage: pnpm eval:report
 *
 * Reads the latest report JSON from eval/reports/ and prints a Markdown table.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(__dirname, '../reports');

function latestReport(): string | null {
  try {
    const files = readdirSync(REPORTS_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();
    return files[0] ?? null;
  } catch {
    return null;
  }
}

function toMarkdownTable(report: Record<string, unknown>): string {
  const dims = (report.dimensionSummaries as Array<{dimension: string; total: number; passed: number; rate: number; avgLatencyMs?: number}>) ?? [];
  const latencyStats = report.latencyStats as Record<string, number> ?? {};
  const confidenceStats = report.confidenceStats as Record<string, number> ?? {};

  let md = `# Evaluation Report — ${report.evalId}\n\n`;
  md += `**Run at:** ${report.runAt}  \n`;
  md += `**Scope:** ${report.scope}  \n`;
  md += `**Dataset:** ${report.datasetName} (${report.datasetSize} questions)  \n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Overall pass rate | **${((report.overallPassRate as number) * 100).toFixed(1)}%** (${report.totalPassed}/${report.datasetSize}) |\n`;
  md += `| Latency mean | ${latencyStats.meanMs?.toFixed(0) ?? '—'}ms |\n`;
  md += `| Latency p50 | ${latencyStats.p50Ms ?? '—'}ms |\n`;
  md += `| Latency p95 | ${latencyStats.p95Ms ?? '—'}ms |\n`;
  md += `| Confidence mean | ${(confidenceStats.mean ?? 0).toFixed(2)} |\n`;
  md += `| Well calibrated | ${confidenceStats.wellCalibrated}/${confidenceStats.totalWithConfidence} |\n\n`;

  md += `## Dimension Breakdown\n\n`;
  md += `| Dimension | Passed | Total | Rate | Avg Latency |\n`;
  md += `|-----------|--------|-------|------|-------------|\n`;
  for (const d of dims) {
    const bar = '█'.repeat(Math.round(d.rate * 10)) + '░'.repeat(10 - Math.round(d.rate * 10));
    md += `| ${d.dimension} | ${d.passed} | ${d.total} | ${(d.rate * 100).toFixed(1)}% \`${bar}\` | ${d.avgLatencyMs ? `${d.avgLatencyMs.toFixed(0)}ms` : '—'} |\n`;
  }
  md += '\n';

  md += `## Per-Question Results\n\n`;
  md += `| ID | Pass | Answer | Latency | Dimensions |\n`;
  md += `|----|------|--------|---------|------------|\n`;
  const results = (report.results as Array<{datasetEntryId: string; passed: boolean; answerScore: {exactMatch: boolean}; latencyScore: {totalLatencyMs: number; withinSla: boolean}; passedDimensions: string[]; failedDimensions: string[]}>) ?? [];
  for (const r of results) {
    const allDims = [...r.passedDimensions, ...r.failedDimensions].join(', ');
    md += `| ${r.datasetEntryId} | ${r.passed ? '✅' : '❌'} | ${r.answerScore.exactMatch ? '✅' : '❌'} | ${r.latencyScore.totalLatencyMs}ms ${r.latencyScore.withinSla ? '✅' : '⚠️'} | ${allDims} |\n`;
  }
  md += '\n';

  return md;
}

async function main() {
  const latest = latestReport();
  if (!latest) {
    console.error('[report-eval] No reports found. Run `pnpm eval` first.');
    process.exit(1);
  }

  const reportPath = join(REPORTS_DIR, latest);
  const raw = readFileSync(reportPath, 'utf-8');
  const report = JSON.parse(raw);

  const md = toMarkdownTable(report);
  console.log(md);

  // Also save as .md
  const { writeFileSync } = await import('node:fs');
  const mdPath = reportPath.replace('.json', '.md');
  writeFileSync(mdPath, md);
  console.log(`[report-eval] Markdown report saved → ${mdPath}`);
}

main().catch((err) => {
  console.error('[report-eval] Fatal error:', err);
  process.exit(1);
});