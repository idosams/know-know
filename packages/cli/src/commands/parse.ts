import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import type { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultRegistry } from '@codegraph/core';
import type { ParseResult } from '@codegraph/core';
import { formatJson } from '../utils/format.js';

function collectFilePaths(targetPath: string): readonly string[] {
  const stat = statSync(targetPath);
  if (stat.isFile()) {
    return [targetPath];
  }

  if (!stat.isDirectory()) {
    return [];
  }

  const skipDirs = new Set([
    'node_modules', '.git', 'dist', 'build', '__pycache__',
    '.venv', 'venv', 'coverage',
  ]);

  const results: string[] = [];

  function walk(dir: string): void {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith('.') || skipDirs.has(entry)) continue;
      const fullPath = join(dir, entry);
      const s = statSync(fullPath);
      if (s.isDirectory()) {
        walk(fullPath);
      } else if (s.isFile()) {
        results.push(fullPath);
      }
    }
  }

  walk(targetPath);
  return results;
}

interface ParseOptions {
  readonly format: string;
  readonly validate?: boolean;
  readonly language?: string;
  readonly pretty?: boolean;
}

function runParse(targetPath: string, options: ParseOptions): void {
  const absPath = resolve(targetPath);

  try {
    statSync(absPath);
  } catch {
    console.error(chalk.red(`Error: Path not found: ${absPath}`));
    process.exitCode = 1;
    return;
  }

  const registry = createDefaultRegistry();
  const files = collectFilePaths(absPath);
  const allResults: ParseResult[] = [];
  let fileCount = 0;

  for (const filePath of files) {
    const ext = extname(filePath);
    const parsable = ['.py', '.ts', '.tsx', '.js', '.jsx'];
    if (!parsable.includes(ext) && !options.language) continue;

    try {
      const content = readFileSync(filePath, 'utf-8');
      const results = registry.parseFile(content, filePath);
      if (results.length > 0) {
        fileCount++;
        allResults.push(...results);
      }
    } catch (err) {
      console.error(
        chalk.yellow(`Warning: Could not parse ${filePath}: ${err instanceof Error ? err.message : String(err)}`),
      );
    }
  }

  if (options.validate) {
    let hasErrors = false;
    for (const result of allResults) {
      if (!result.metadata.description) {
        console.error(
          chalk.red(`Validation error in ${result.filePath}:${result.line} - ${result.name}: missing description`),
        );
        hasErrors = true;
      }
    }
    if (hasErrors) {
      process.exitCode = 1;
    }
  }

  if (options.format === 'yaml') {
    // Dynamic import for yaml since it's optional
    import('yaml').then((yamlModule) => {
      console.log(yamlModule.stringify(allResults));
      printSummary(allResults.length, fileCount);
    }).catch(() => {
      console.error(chalk.red('Error: yaml package not installed. Use --format json or install yaml.'));
      process.exitCode = 1;
    });
  } else {
    const pretty = options.pretty ?? false;
    console.log(formatJson(allResults, pretty));
    printSummary(allResults.length, fileCount);
  }
}

function printSummary(entityCount: number, fileCount: number): void {
  console.error(
    chalk.green(`\nFound ${chalk.bold(String(entityCount))} entities in ${chalk.bold(String(fileCount))} files`),
  );
}

export function registerParseCommand(program: Command): void {
  program
    .command('parse <path>')
    .description('Parse a file or directory for codegraph annotations')
    .option('--format <format>', 'Output format (json|yaml)', 'json')
    .option('--validate', 'Validate metadata against schema')
    .option('--language <lang>', 'Override language auto-detection')
    .option('--pretty', 'Pretty-print output')
    .action((path: string, options: ParseOptions) => {
      runParse(path, options);
    });
}
