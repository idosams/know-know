/**
 * @knowgraph
 * type: module
 * description: Main validator that scans files, parses annotations, and runs validation rules
 * owner: knowgraph-core
 * status: experimental
 * tags: [validation, scanner, core]
 * context:
 *   business_goal: Ensure annotation quality across the entire codebase
 *   domain: validation
 */
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createDefaultRegistry } from '../parsers/registry.js';
import type { ParseResult } from '../types/parse-result.js';
import type { ValidationIssue, ValidationResult, ValidationRule } from './types.js';
import { createAllDefaultRules } from './rules.js';

const PARSABLE_EXTENSIONS = new Set(['.py', '.ts', '.tsx', '.js', '.jsx']);

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

export interface ValidateOptions {
  readonly strict?: boolean;
  readonly ruleName?: string;
}

function collectFiles(targetPath: string): readonly string[] {
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

function buildResult(
  issues: readonly ValidationIssue[],
  fileCount: number,
): ValidationResult {
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  return {
    issues,
    fileCount,
    errorCount,
    warningCount,
    isValid: errorCount === 0,
  };
}

export interface Validator {
  validate(rootDir: string, options?: ValidateOptions): ValidationResult;
}

export function createValidator(customRules?: readonly ValidationRule[]): Validator {
  const rules = customRules ?? createAllDefaultRules();

  return {
    validate(rootDir: string, options?: ValidateOptions): ValidationResult {
      const activeRules = options?.ruleName
        ? rules.filter((r) => r.name === options.ruleName)
        : rules;

      if (options?.ruleName && activeRules.length === 0) {
        return buildResult([], 0);
      }

      const registry = createDefaultRegistry();
      const files = collectFiles(rootDir);
      const allIssues: ValidationIssue[] = [];
      let annotatedFileCount = 0;

      for (const filePath of files) {
        const ext = extname(filePath);
        if (!PARSABLE_EXTENSIONS.has(ext)) continue;

        let content: string;
        try {
          content = readFileSync(filePath, 'utf-8');
        } catch {
          continue;
        }

        let results: readonly ParseResult[];
        try {
          results = registry.parseFile(content, filePath);
        } catch {
          continue;
        }

        if (results.length === 0) continue;

        annotatedFileCount++;

        for (const parseResult of results) {
          for (const rule of activeRules) {
            const issues = rule.check(parseResult);
            allIssues.push(...issues);
          }
        }
      }

      return buildResult(allIssues, annotatedFileCount);
    },
  };
}
