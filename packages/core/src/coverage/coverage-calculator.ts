/**
 * @knowgraph
 * type: module
 * description: Pure functions to calculate documentation coverage by scanning files for @knowgraph annotations
 * owner: knowgraph-core
 * status: experimental
 * tags: [coverage, calculator, scanner]
 * context:
 *   business_goal: Measure what percentage of parseable files have @knowgraph annotations
 *   domain: coverage-engine
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative, dirname } from 'node:path';
import { createDefaultRegistry } from '../parsers/registry.js';
import type { ParserRegistry } from '../parsers/types.js';
import type {
  CoverageBreakdown,
  CoverageOptions,
  CoverageResult,
  FileCoverageInfo,
} from './types.js';

const SKIP_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '__pycache__',
  '.venv',
  'venv',
  'coverage',
  '.next',
  '.tox',
]);

const PARSEABLE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.py',
  '.pyi',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.cts',
]);

const EXTENSION_TO_LANGUAGE: Readonly<Record<string, string>> = {
  '.py': 'python',
  '.pyi': 'python',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mts': 'typescript',
  '.cts': 'typescript',
};

function collectParseableFiles(
  rootDir: string,
  exclude: ReadonlySet<string>,
): readonly string[] {
  const results: string[] = [];

  function walk(dir: string): void {
    let entries: readonly string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith('.') || exclude.has(entry)) continue;
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (stat.isFile() && PARSEABLE_EXTENSIONS.has(extname(entry))) {
          results.push(fullPath);
        }
      } catch {
        // Skip inaccessible files
      }
    }
  }

  walk(rootDir);
  return results;
}

function analyzeFile(
  filePath: string,
  rootDir: string,
  registry: ParserRegistry,
): FileCoverageInfo {
  const ext = extname(filePath);
  const language = EXTENSION_TO_LANGUAGE[ext] ?? 'unknown';
  const relPath = relative(rootDir, filePath);

  try {
    const content = readFileSync(filePath, 'utf-8');
    const results = registry.parseFile(content, filePath);
    return {
      filePath: relPath,
      language,
      hasAnnotation: results.length > 0,
      entityCount: results.length,
    };
  } catch {
    return {
      filePath: relPath,
      language,
      hasAnnotation: false,
      entityCount: 0,
    };
  }
}

function computePercentage(annotated: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((annotated / total) * 1000) / 10;
}

function buildBreakdown(
  files: readonly FileCoverageInfo[],
  keyFn: (file: FileCoverageInfo) => string,
): readonly CoverageBreakdown[] {
  const groups = new Map<
    string,
    { annotatedCount: number; totalCount: number }
  >();

  for (const file of files) {
    const key = keyFn(file);
    const existing = groups.get(key) ?? { annotatedCount: 0, totalCount: 0 };
    groups.set(key, {
      annotatedCount:
        existing.annotatedCount + (file.hasAnnotation ? 1 : 0),
      totalCount: existing.totalCount + 1,
    });
  }

  return [...groups.entries()]
    .map(([category, { annotatedCount, totalCount }]) => ({
      category,
      annotatedCount,
      totalCount,
      percentage: computePercentage(annotatedCount, totalCount),
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

function buildOwnerBreakdown(
  files: readonly FileCoverageInfo[],
  rootDir: string,
  registry: ParserRegistry,
): readonly CoverageBreakdown[] {
  const ownerMap = new Map<
    string,
    { annotatedCount: number; totalCount: number }
  >();

  for (const file of files) {
    if (!file.hasAnnotation) {
      const key = '(no owner)';
      const existing = ownerMap.get(key) ?? {
        annotatedCount: 0,
        totalCount: 0,
      };
      ownerMap.set(key, {
        annotatedCount: existing.annotatedCount,
        totalCount: existing.totalCount + 1,
      });
      continue;
    }

    const absPath = join(rootDir, file.filePath);
    try {
      const content = readFileSync(absPath, 'utf-8');
      const results = registry.parseFile(content, absPath);
      const owners = new Set<string>();
      for (const result of results) {
        owners.add(result.metadata.owner ?? '(no owner)');
      }
      for (const owner of owners) {
        const existing = ownerMap.get(owner) ?? {
          annotatedCount: 0,
          totalCount: 0,
        };
        ownerMap.set(owner, {
          annotatedCount: existing.annotatedCount + 1,
          totalCount: existing.totalCount + 1,
        });
      }
    } catch {
      const key = '(no owner)';
      const existing = ownerMap.get(key) ?? {
        annotatedCount: 0,
        totalCount: 0,
      };
      ownerMap.set(key, {
        annotatedCount: existing.annotatedCount,
        totalCount: existing.totalCount + 1,
      });
    }
  }

  return [...ownerMap.entries()]
    .map(([category, { annotatedCount, totalCount }]) => ({
      category,
      annotatedCount,
      totalCount,
      percentage: computePercentage(annotatedCount, totalCount),
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

export function calculateCoverage(options: CoverageOptions): CoverageResult {
  const { rootDir, exclude = [] } = options;
  const excludeSet = new Set([...SKIP_DIRS, ...exclude]);
  const registry = createDefaultRegistry();
  const filePaths = collectParseableFiles(rootDir, excludeSet);

  const files: readonly FileCoverageInfo[] = filePaths.map((fp) =>
    analyzeFile(fp, rootDir, registry),
  );

  const annotatedFiles = files.filter((f) => f.hasAnnotation).length;
  const totalFiles = files.length;

  const byLanguage = buildBreakdown(files, (f) => f.language);
  const byDirectory = buildBreakdown(files, (f) => {
    const dir = dirname(f.filePath);
    return dir === '.' ? '(root)' : dir;
  });
  const byOwner = buildOwnerBreakdown(files, rootDir, registry);

  return {
    totalFiles,
    annotatedFiles,
    percentage: computePercentage(annotatedFiles, totalFiles),
    byLanguage,
    byDirectory,
    byOwner,
    files,
  };
}
