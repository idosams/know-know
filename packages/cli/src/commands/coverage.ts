/**
 * @knowgraph
 * type: module
 * description: CLI command that reports documentation coverage for @knowgraph annotations
 * owner: knowgraph-cli
 * status: experimental
 * tags: [cli, command, coverage, reporting]
 * context:
 *   business_goal: Let developers measure and enforce annotation coverage in CI
 *   domain: cli
 */
import { resolve } from 'node:path';
import { statSync } from 'node:fs';
import type { Command } from 'commander';
import chalk from 'chalk';
import { calculateCoverage } from '@knowgraph/core';
import type { CoverageBreakdown, CoverageResult } from '@knowgraph/core';
import { formatJson } from '../utils/format.js';

interface CoverageCommandOptions {
  readonly format: string;
  readonly threshold?: string;
  readonly by?: string;
}

function formatPercentage(pct: number): string {
  if (pct >= 80) return chalk.green(`${pct}%`);
  if (pct >= 50) return chalk.yellow(`${pct}%`);
  return chalk.red(`${pct}%`);
}

function printBreakdownTable(
  title: string,
  breakdowns: readonly CoverageBreakdown[],
): void {
  console.log('');
  console.log(chalk.bold(title));
  console.log(
    `  ${'Category'.padEnd(40)} ${'Annotated'.padStart(10)} ${'Total'.padStart(10)} ${'Coverage'.padStart(10)}`,
  );
  console.log(`  ${'─'.repeat(70)}`);

  for (const b of breakdowns) {
    const category = b.category.length > 38 ? `${b.category.slice(0, 35)}...` : b.category;
    console.log(
      `  ${category.padEnd(40)} ${String(b.annotatedCount).padStart(10)} ${String(b.totalCount).padStart(10)} ${formatPercentage(b.percentage).padStart(19)}`,
    );
  }
}

function printTableOutput(
  result: CoverageResult,
  byDimension?: string,
): void {
  console.log('');
  console.log(
    chalk.bold('Documentation Coverage Report'),
  );
  console.log(`  Total files:     ${chalk.cyan(String(result.totalFiles))}`);
  console.log(
    `  Annotated files: ${chalk.cyan(String(result.annotatedFiles))}`,
  );
  console.log(`  Coverage:        ${formatPercentage(result.percentage)}`);

  if (!byDimension || byDimension === 'language') {
    printBreakdownTable('By Language:', result.byLanguage);
  }

  if (!byDimension || byDimension === 'directory') {
    printBreakdownTable('By Directory:', result.byDirectory);
  }

  if (!byDimension || byDimension === 'owner') {
    printBreakdownTable('By Owner:', result.byOwner);
  }
}

function runCoverage(
  targetPath: string,
  options: CoverageCommandOptions,
): void {
  const absPath = resolve(targetPath);

  try {
    statSync(absPath);
  } catch {
    console.error(chalk.red(`Error: Path not found: ${absPath}`));
    process.exitCode = 1;
    return;
  }

  try {
    const result = calculateCoverage({ rootDir: absPath });

    if (options.format === 'json') {
      console.log(formatJson(result, true));
    } else {
      printTableOutput(result, options.by);
    }

    if (options.threshold !== undefined) {
      const threshold = Number(options.threshold);
      if (Number.isNaN(threshold)) {
        console.error(
          chalk.red(`Error: Invalid threshold value: ${options.threshold}`),
        );
        process.exitCode = 1;
        return;
      }

      if (result.percentage < threshold) {
        console.error('');
        console.error(
          chalk.red(
            `Coverage ${result.percentage}% is below threshold ${threshold}%`,
          ),
        );
        process.exitCode = 1;
      }
    }
  } catch (err) {
    console.error(
      chalk.red(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
    process.exitCode = 1;
  }
}

export function registerCoverageCommand(program: Command): void {
  program
    .command('coverage [path]')
    .description(
      'Report documentation coverage for @knowgraph annotations',
    )
    .option('--format <format>', 'Output format (table|json)', 'table')
    .option(
      '--threshold <number>',
      'Exit with code 1 if coverage is below this percentage',
    )
    .option(
      '--by <dimension>',
      'Breakdown dimension (language|directory|owner)',
    )
    .action((path: string | undefined, opts: CoverageCommandOptions) => {
      runCoverage(path ?? '.', opts);
    });
}
