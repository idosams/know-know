/**
 * @knowgraph
 * type: module
 * description: CLI command that suggests the most impactful files to annotate next
 * owner: knowgraph-cli
 * status: experimental
 * tags: [cli, command, suggest, prioritization]
 * context:
 *   business_goal: Help developers prioritize which files to annotate first
 *   domain: cli
 */
import { resolve } from 'node:path';
import { statSync } from 'node:fs';
import type { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultRegistry, createSuggestionEngine } from '@knowgraph/core';
import type { SuggestionResult } from '@knowgraph/core';

interface SuggestOptions {
  readonly limit: string;
  readonly format: string;
}

function formatTextOutput(result: SuggestionResult): string {
  const lines: string[] = [];

  if (result.suggestions.length === 0) {
    lines.push(chalk.green('No unannotated files found. Great job!'));
    return lines.join('\n');
  }

  lines.push(
    chalk.bold(
      `${result.totalUnannotated} unannotated files found, showing top ${result.suggestions.length}`,
    ),
  );
  lines.push('');

  for (let i = 0; i < result.suggestions.length; i++) {
    const suggestion = result.suggestions[i]!;
    const rank = chalk.cyan(`${i + 1}.`);
    const filePath = chalk.white(suggestion.filePath);
    const score = chalk.yellow(`(score: ${suggestion.score})`);
    const reasons = chalk.gray(`- ${suggestion.reasons.join(', ')}`);

    lines.push(`${rank} ${filePath} ${score} ${reasons}`);
  }

  return lines.join('\n');
}

function formatJsonOutput(result: SuggestionResult): string {
  return JSON.stringify(result, null, 2);
}

function runSuggest(targetPath: string, options: SuggestOptions): void {
  const absPath = resolve(targetPath);

  try {
    statSync(absPath);
  } catch {
    console.error(chalk.red(`Error: Path not found: ${absPath}`));
    process.exitCode = 1;
    return;
  }

  try {
    const registry = createDefaultRegistry();
    const engine = createSuggestionEngine(registry);
    const limit = parseInt(options.limit, 10);

    if (Number.isNaN(limit) || limit < 1) {
      console.error(chalk.red('Error: --limit must be a positive integer'));
      process.exitCode = 1;
      return;
    }

    const result = engine.suggest({ rootDir: absPath, limit });

    if (options.format === 'json') {
      console.log(formatJsonOutput(result));
    } else {
      console.log(formatTextOutput(result));
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

export function registerSuggestCommand(program: Command): void {
  program
    .command('suggest [path]')
    .description(
      'Suggest the most impactful files to annotate next',
    )
    .option('--limit <n>', 'Number of suggestions to show', '10')
    .option('--format <format>', 'Output format (text|json)', 'text')
    .action((path: string | undefined, options: SuggestOptions) => {
      runSuggest(path ?? '.', options);
    });
}
