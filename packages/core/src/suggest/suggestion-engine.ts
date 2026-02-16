/**
 * @knowgraph
 * type: module
 * description: Suggestion engine that scores and ranks unannotated files by annotation priority
 * owner: knowgraph-core
 * status: experimental
 * tags: [suggest, engine, scoring, heuristics]
 * context:
 *   business_goal: Help developers find the most impactful files to annotate next
 *   domain: suggest-engine
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename, relative } from 'node:path';
import type { ParserRegistry } from '../parsers/types.js';
import type {
  FileSuggestion,
  SuggestionOptions,
  SuggestionReason,
  SuggestionResult,
} from './types.js';

const KNOWGRAPH_MARKER = '@knowgraph';

const ENTRY_POINT_NAMES: ReadonlySet<string> = new Set([
  'index.ts',
  'index.js',
  'index.tsx',
  'index.jsx',
  'main.ts',
  'main.js',
  'app.ts',
  'app.js',
  'main.py',
  'app.py',
  '__init__.py',
  'server.ts',
  'server.js',
]);

const PARSABLE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.py',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
]);

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
  '.knowgraph',
]);

const CONFIG_PATTERNS: ReadonlySet<string> = new Set([
  'eslint.config.js',
  'eslint.config.ts',
  'vitest.config.ts',
  'vitest.config.js',
  'jest.config.ts',
  'jest.config.js',
  'tsconfig.json',
  'babel.config.js',
  'webpack.config.js',
  'rollup.config.js',
  'vite.config.ts',
  'vite.config.js',
  'prettier.config.js',
  'postcss.config.js',
  'tailwind.config.js',
  'tailwind.config.ts',
]);

const PRIMARY_LANGUAGE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts',
  '.tsx',
  '.py',
]);

function isTestFile(fileName: string): boolean {
  return (
    fileName.includes('.test.') ||
    fileName.includes('.spec.') ||
    fileName.includes('__test__') ||
    fileName.startsWith('test_')
  );
}

function isConfigFile(fileName: string): boolean {
  return CONFIG_PATTERNS.has(fileName) || fileName.startsWith('.');
}

function isFixtureFile(filePath: string): boolean {
  return (
    filePath.includes('/fixtures/') ||
    filePath.includes('/__fixtures__/') ||
    filePath.includes('/fixture/')
  );
}

function hasKnowgraphAnnotation(content: string): boolean {
  return content.includes(KNOWGRAPH_MARKER);
}

function countImports(content: string): number {
  const importRegex = /^(?:import\s|from\s|const\s+\w+\s*=\s*require\()/gm;
  const matches = content.match(importRegex);
  return matches?.length ?? 0;
}

function countLines(content: string): number {
  if (content.length === 0) return 0;
  return content.split('\n').length;
}

function extensionToLanguage(ext: string): string {
  switch (ext) {
    case '.py':
      return 'python';
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.js':
    case '.jsx':
      return 'javascript';
    default:
      return 'unknown';
  }
}

function isInSrcDirectory(filePath: string): boolean {
  return filePath.includes('/src/') || filePath.startsWith('src/');
}

function collectFiles(rootDir: string): readonly string[] {
  const results: string[] = [];

  function walk(dir: string): void {
    let entries: readonly string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith('.') || SKIP_DIRS.has(entry)) continue;

      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (stat.isFile()) {
          const ext = extname(entry);
          if (PARSABLE_EXTENSIONS.has(ext)) {
            results.push(fullPath);
          }
        }
      } catch {
        // Skip inaccessible files
      }
    }
  }

  walk(rootDir);
  return results;
}

interface FileAnalysis {
  readonly filePath: string;
  readonly relativePath: string;
  readonly fileName: string;
  readonly content: string;
  readonly lineCount: number;
  readonly importCount: number;
  readonly extension: string;
  readonly isAnnotated: boolean;
}

function analyzeFile(filePath: string, rootDir: string): FileAnalysis | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const fileName = basename(filePath);
    const relativePath = relative(rootDir, filePath);
    return {
      filePath,
      relativePath,
      fileName,
      content,
      lineCount: countLines(content),
      importCount: countImports(content),
      extension: extname(fileName),
      isAnnotated: hasKnowgraphAnnotation(content),
    };
  } catch {
    return null;
  }
}

function scoreFile(analysis: FileAnalysis): FileSuggestion {
  let score = 0;
  const reasons: SuggestionReason[] = [];

  if (ENTRY_POINT_NAMES.has(analysis.fileName)) {
    score += 100;
    reasons.push('entry-point');
  }

  if (analysis.lineCount > 200) {
    score += 100;
    reasons.push('large-file');
  } else if (analysis.lineCount > 100) {
    score += 50;
    reasons.push('large-file');
  }

  if (isInSrcDirectory(analysis.relativePath)) {
    score += 20;
    reasons.push('exported-module');
  }

  if (analysis.importCount > 10) {
    score += 60;
    reasons.push('many-imports');
  } else if (analysis.importCount > 5) {
    score += 30;
    reasons.push('many-imports');
  }

  if (PRIMARY_LANGUAGE_EXTENSIONS.has(analysis.extension)) {
    score += 10;
  }

  if (reasons.length === 0) {
    reasons.push('uncovered');
  }

  return {
    filePath: analysis.relativePath,
    score,
    reasons,
    language: extensionToLanguage(analysis.extension),
    lineCount: analysis.lineCount,
  };
}

function shouldExclude(analysis: FileAnalysis): boolean {
  return (
    isTestFile(analysis.fileName) ||
    isConfigFile(analysis.fileName) ||
    isFixtureFile(analysis.relativePath) ||
    analysis.isAnnotated
  );
}

export interface SuggestionEngine {
  readonly suggest: (options: SuggestionOptions) => SuggestionResult;
}

export function createSuggestionEngine(
  _registry: ParserRegistry,
): SuggestionEngine {
  return {
    suggest(options: SuggestionOptions): SuggestionResult {
      const { rootDir, limit = 10 } = options;
      const allFiles = collectFiles(rootDir);
      const analyses = allFiles
        .map((f) => analyzeFile(f, rootDir))
        .filter((a): a is FileAnalysis => a !== null);

      const totalFiles = analyses.length;

      const unannotated = analyses.filter((a) => !shouldExclude(a));
      const totalUnannotated = unannotated.length;

      const scored = unannotated.map(scoreFile);
      const sorted = [...scored].sort((a, b) => b.score - a.score);
      const suggestions = sorted.slice(0, limit);

      return {
        suggestions,
        totalUnannotated,
        totalFiles,
      };
    },
  };
}
