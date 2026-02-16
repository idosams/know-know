/**
 * @knowgraph
 * type: module
 * description: CLI command that validates @knowgraph annotations in source files
 * owner: knowgraph-cli
 * status: experimental
 * tags: [cli, command, validate, annotations]
 * context:
 *   business_goal: Help developers catch annotation errors before committing
 *   domain: cli
 */
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, resolve, extname, relative } from 'node:path';
import type { Command } from 'commander';
import chalk from 'chalk';
import {
  createDefaultRegistry,
  extractKnowgraphYaml,
  parseAndValidateMetadata,
} from '@knowgraph/core';

const PARSABLE_EXTENSIONS = new Set([
  '.py',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.cts',
]);

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '__pycache__',
  '.venv',
  'venv',
  'coverage',
]);

export interface ValidationError {
  readonly filePath: string;
  readonly line: number;
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

export interface ValidationSummary {
  readonly filesScanned: number;
  readonly entitiesFound: number;
  readonly validEntities: number;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationError[];
}

interface ValidateOptions {
  readonly path: string;
  readonly strict: boolean;
  readonly format: string;
}

function collectFilePaths(targetPath: string): readonly string[] {
  const stat = statSync(targetPath);
  if (stat.isFile()) {
    return [targetPath];
  }

  if (!stat.isDirectory()) {
    return [];
  }

  const results: string[] = [];

  function walk(dir: string): void {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith('.') || SKIP_DIRS.has(entry)) continue;
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

interface CommentBlock {
  readonly text: string;
  readonly line: number;
}

function getLineNumber(source: string, charIndex: number): number {
  let line = 1;
  for (let i = 0; i < charIndex && i < source.length; i++) {
    if (source[i] === '\n') {
      line++;
    }
  }
  return line;
}

function extractCommentBlocks(content: string): readonly CommentBlock[] {
  const blocks: CommentBlock[] = [];

  const jsdocRegex = /\/\*\*[\s\S]*?\*\//g;
  let match: RegExpExecArray | null;
  while ((match = jsdocRegex.exec(content)) !== null) {
    if (match[0].includes('@knowgraph')) {
      const line = getLineNumber(content, match.index);
      const inner = match[0].slice(3, -2);
      const lines = inner
        .split('\n')
        .map((l) => l.replace(/^\s*\*\s?/, ''));
      blocks.push({ text: lines.join('\n').trim(), line });
    }
  }

  const pyDocRegex = /(?:"""|''')[\s\S]*?(?:"""|''')/g;
  while ((match = pyDocRegex.exec(content)) !== null) {
    if (match[0].includes('@knowgraph')) {
      const line = getLineNumber(content, match.index);
      const inner = match[0].slice(3, -3);
      blocks.push({ text: inner.trim(), line });
    }
  }

  const lines = content.split('\n');
  let hashBlock: string[] = [];
  let hashBlockStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (trimmed.startsWith('#')) {
      if (hashBlock.length === 0) {
        hashBlockStart = i + 1;
      }
      hashBlock.push(trimmed.replace(/^#\s?/, ''));
    } else {
      if (hashBlock.length > 0) {
        const blockText = hashBlock.join('\n');
        if (blockText.includes('@knowgraph')) {
          blocks.push({ text: blockText, line: hashBlockStart });
        }
        hashBlock = [];
        hashBlockStart = -1;
      }
    }
  }

  if (hashBlock.length > 0) {
    const blockText = hashBlock.join('\n');
    if (blockText.includes('@knowgraph')) {
      blocks.push({ text: blockText, line: hashBlockStart });
    }
  }

  return blocks;
}

function validateFileContent(
  content: string,
  filePath: string,
): {
  readonly entities: number;
  readonly validEntities: number;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationError[];
} {
  const registry = createDefaultRegistry();
  const parseResults = registry.parseFile(content, filePath);
  const validEntities = parseResults.length;

  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const commentBlocks = extractCommentBlocks(content);
  let totalAnnotations = 0;

  for (const block of commentBlocks) {
    const yamlContent = extractKnowgraphYaml(block.text);
    if (yamlContent === null) continue;

    totalAnnotations++;

    const result = parseAndValidateMetadata(yamlContent, block.line);
    if (result.errors.length > 0) {
      for (const err of result.errors) {
        errors.push({
          filePath,
          line: err.line ?? block.line,
          message: err.message,
          severity: 'error',
        });
      }
    }

    if (result.metadata) {
      if (!result.metadata.owner) {
        warnings.push({
          filePath,
          line: block.line,
          message: 'Missing recommended field: owner',
          severity: 'warning',
        });
      }
      if (!result.metadata.status) {
        warnings.push({
          filePath,
          line: block.line,
          message: 'Missing recommended field: status',
          severity: 'warning',
        });
      }
      if (!result.metadata.tags || result.metadata.tags.length === 0) {
        warnings.push({
          filePath,
          line: block.line,
          message: 'Missing recommended field: tags',
          severity: 'warning',
        });
      }
    }
  }

  const entitiesFound = Math.max(totalAnnotations, validEntities);

  return { entities: entitiesFound, validEntities, errors, warnings };
}

export function runValidate(options: ValidateOptions): ValidationSummary {
  const absPath = resolve(options.path);

  try {
    statSync(absPath);
  } catch {
    return {
      filesScanned: 0,
      entitiesFound: 0,
      validEntities: 0,
      errors: [
        {
          filePath: absPath,
          line: 0,
          message: `Path not found: ${absPath}`,
          severity: 'error',
        },
      ],
      warnings: [],
    };
  }

  const files = collectFilePaths(absPath);
  let filesScanned = 0;
  let totalEntities = 0;
  let totalValid = 0;
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  for (const filePath of files) {
    const ext = extname(filePath);
    if (!PARSABLE_EXTENSIONS.has(ext)) continue;

    filesScanned++;

    try {
      const content = readFileSync(filePath, 'utf-8');
      const result = validateFileContent(content, filePath);
      totalEntities += result.entities;
      totalValid += result.validEntities;
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    } catch (err) {
      allErrors.push({
        filePath,
        line: 0,
        message: `Could not read file: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    }
  }

  const finalErrors = options.strict
    ? [
        ...allErrors,
        ...allWarnings.map((w) => ({ ...w, severity: 'error' as const })),
      ]
    : allErrors;
  const finalWarnings = options.strict ? [] : allWarnings;

  return {
    filesScanned,
    entitiesFound: totalEntities,
    validEntities: totalValid,
    errors: finalErrors,
    warnings: finalWarnings,
  };
}

function formatTextOutput(
  summary: ValidationSummary,
  basePath: string,
): string {
  const lines: string[] = [];

  lines.push(chalk.bold('Validation Report'));
  lines.push('');

  if (summary.errors.length > 0) {
    lines.push(chalk.red.bold(`Errors (${summary.errors.length}):`));
    for (const err of summary.errors) {
      const relPath = relative(basePath, err.filePath);
      lines.push(chalk.red(`  ${relPath}:${err.line} - ${err.message}`));
    }
    lines.push('');
  }

  if (summary.warnings.length > 0) {
    lines.push(chalk.yellow.bold(`Warnings (${summary.warnings.length}):`));
    for (const warn of summary.warnings) {
      const relPath = relative(basePath, warn.filePath);
      lines.push(
        chalk.yellow(`  ${relPath}:${warn.line} - ${warn.message}`),
      );
    }
    lines.push('');
  }

  lines.push(chalk.bold('Summary:'));
  lines.push(`  Files scanned:  ${summary.filesScanned}`);
  lines.push(`  Entities found: ${summary.entitiesFound}`);
  lines.push(`  Valid entities: ${summary.validEntities}`);
  lines.push(`  Errors:         ${summary.errors.length}`);
  lines.push(`  Warnings:       ${summary.warnings.length}`);

  if (summary.errors.length === 0 && summary.warnings.length === 0) {
    lines.push('');
    lines.push(chalk.green('All annotations are valid.'));
  }

  return lines.join('\n');
}

export function registerValidateCommand(program: Command): void {
  program
    .command('validate')
    .description('Validate @knowgraph annotations in source files')
    .option('--path <dir>', 'Directory or file to validate', '.')
    .option('--strict', 'Treat warnings as errors', false)
    .option('--format <format>', 'Output format (text|json)', 'text')
    .action(
      (opts: { path: string; strict: boolean; format: string }) => {
        const summary = runValidate({
          path: opts.path,
          strict: opts.strict,
          format: opts.format,
        });

        if (opts.format === 'json') {
          console.log(JSON.stringify(summary, null, 2));
        } else {
          const basePath = resolve(opts.path);
          console.log(formatTextOutput(summary, basePath));
        }

        if (summary.errors.length > 0) {
          process.exitCode = 1;
        }
      },
    );
}
