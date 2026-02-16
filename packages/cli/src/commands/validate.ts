/**
 * @knowgraph
 * type: module
 * description: CLI command that validates knowgraph annotations and reports issues
 * owner: knowgraph-cli
 * status: experimental
 * tags: [cli, command, validate, quality]
 * context:
 *   business_goal: Help developers find and fix annotation issues before committing
 *   domain: cli
 */
import { resolve } from 'node:path';
import { statSync } from 'node:fs';
import type { Command } from 'commander';
import chalk from 'chalk';
import { createValidator } from '@knowgraph/core';
import type { ValidationIssue, ValidationResult } from '@knowgraph/core';

interface ValidateCommandOptions {
  readonly strict?: boolean;
  readonly format: string;
  readonly rule?: string;
}

function formatIssueText(issue: ValidationIssue): string {
  const severity =
    issue.severity === 'error'
      ? chalk.red('[ERROR]')
      : chalk.yellow('[WARN]');
  const location = chalk.cyan(`${issue.filePath}:${issue.line}`);
  const ruleName = chalk.dim(issue.rule);
  return `${location} ${severity} ${ruleName}: ${issue.message}`;
}

function printTextOutput(result: ValidationResult, strict: boolean): void {
  for (const issue of result.issues) {
    console.log(formatIssueText(issue));
  }

  console.log('');

  const isFailure = strict
    ? result.errorCount > 0 || result.warningCount > 0
    : result.errorCount > 0;

  const summaryColor = isFailure ? chalk.red : chalk.green;
  console.log(
    summaryColor(
      `${result.errorCount} error(s), ${result.warningCount} warning(s) in ${result.fileCount} file(s)`,
    ),
  );
}

function printJsonOutput(result: ValidationResult): void {
  console.log(JSON.stringify(result, null, 2));
}

function runValidate(
  targetPath: string,
  options: ValidateCommandOptions,
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
    const validator = createValidator();
    const result = validator.validate(absPath, {
      ruleName: options.rule,
    });

    if (options.format === 'json') {
      printJsonOutput(result);
    } else {
      printTextOutput(result, options.strict ?? false);
    }

    const hasErrors = result.errorCount > 0;
    const hasWarnings = result.warningCount > 0;

    if (hasErrors || (options.strict && hasWarnings)) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(
      chalk.red(
        `Validation failed: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
    process.exitCode = 1;
  }
}

export function registerValidateCommand(program: Command): void {
  program
    .command('validate [path]')
    .description('Validate @knowgraph annotations for correctness')
    .option('--strict', 'Treat warnings as errors')
    .option('--format <format>', 'Output format (text|json)', 'text')
    .option('--rule <name>', 'Run only a specific validation rule')
    .action((path: string | undefined, options: ValidateCommandOptions) => {
      runValidate(path ?? '.', options);
    });
}
