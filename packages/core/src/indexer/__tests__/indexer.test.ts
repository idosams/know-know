import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDatabaseManager } from '../database.js';
import type { DatabaseManager } from '../database.js';
import { createIndexer } from '../indexer.js';
import type { ParserRegistry } from '../indexer.js';
import type { ParseResult } from '../../types/index.js';

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `codegraph-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function createMockParserRegistry(
  results: ReadonlyMap<string, readonly ParseResult[]> = new Map(),
): ParserRegistry {
  return {
    canParse: (filePath: string) =>
      filePath.endsWith('.ts') || filePath.endsWith('.py'),
    parse: (_filePath: string, _content: string) => {
      const key = [...results.keys()].find((k) => _filePath.endsWith(k));
      return key ? results.get(key)! : [];
    },
  };
}

function makeParsedResult(overrides: Partial<ParseResult> = {}): ParseResult {
  return {
    name: 'testFunction',
    filePath: 'src/test.ts',
    line: 1,
    column: 0,
    language: 'typescript',
    entityType: 'function',
    metadata: {
      type: 'function',
      description: 'A test function',
    },
    rawDocstring:
      '/** @know { type: function, description: "A test function" } */',
    ...overrides,
  };
}

describe('Indexer', () => {
  let dbManager: DatabaseManager;
  let tempDir: string;

  beforeEach(() => {
    dbManager = createDatabaseManager();
    dbManager.initialize();
    tempDir = createTempDir();
  });

  afterEach(() => {
    dbManager.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('indexes files from a directory', () => {
    const srcDir = join(tempDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(
      join(srcDir, 'app.ts'),
      '// @know { type: function }\nfunction hello() {}',
    );

    const parseResults = new Map<string, readonly ParseResult[]>([
      ['app.ts', [makeParsedResult({ name: 'hello', filePath: 'src/app.ts' })]],
    ]);
    const registry = createMockParserRegistry(parseResults);
    const indexer = createIndexer(registry, dbManager);

    const result = indexer.index({ rootDir: tempDir });

    expect(result.totalFiles).toBeGreaterThanOrEqual(1);
    expect(result.totalEntities).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('calls progress callback', () => {
    const srcDir = join(tempDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'file1.ts'), 'const a = 1;');

    const registry = createMockParserRegistry();
    const indexer = createIndexer(registry, dbManager);
    const onProgress = vi.fn();

    indexer.index({ rootDir: tempDir, onProgress });

    expect(onProgress).toHaveBeenCalled();
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
    expect(lastCall.processedFiles).toBe(lastCall.totalFiles);
  });

  it('collects errors without throwing', () => {
    const srcDir = join(tempDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'bad.ts'), 'broken content');

    const registry: ParserRegistry = {
      canParse: (fp) => fp.endsWith('.ts'),
      parse: () => {
        throw new Error('Parse failed!');
      },
    };
    const indexer = createIndexer(registry, dbManager);

    const result = indexer.index({ rootDir: tempDir });

    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0].message).toContain('Parse failed!');
  });

  it('skips unchanged files in incremental mode', () => {
    const srcDir = join(tempDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'stable.ts'), 'function stable() {}');

    const parseResults = new Map<string, readonly ParseResult[]>([
      [
        'stable.ts',
        [makeParsedResult({ name: 'stable', filePath: 'src/stable.ts' })],
      ],
    ]);
    const registry = createMockParserRegistry(parseResults);
    const indexer = createIndexer(registry, dbManager);

    // First index
    const result1 = indexer.index({ rootDir: tempDir, incremental: true });
    expect(result1.totalEntities).toBe(1);

    // Second index - file unchanged
    const parseSpy = vi.spyOn(registry, 'parse');
    indexer.index({ rootDir: tempDir, incremental: true });

    // Since file is unchanged, parse should not be called
    expect(parseSpy.mock.calls.length).toBe(0);
    // Entities remain from first pass
    const entities = dbManager.getEntitiesByFilePath('src/stable.ts');
    expect(entities).toHaveLength(1);
  });

  it('respects .gitignore patterns', () => {
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    mkdirSync(join(tempDir, 'build'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'app.ts'), 'function app() {}');
    writeFileSync(join(tempDir, 'build', 'output.ts'), 'function output() {}');
    writeFileSync(join(tempDir, '.gitignore'), 'build/\n');

    const registry: ParserRegistry = {
      canParse: (fp) => fp.endsWith('.ts'),
      parse: vi.fn().mockReturnValue([]),
    };
    const indexer = createIndexer(registry, dbManager);

    indexer.index({ rootDir: tempDir });

    const parseCalls = (registry.parse as ReturnType<typeof vi.fn>).mock.calls;
    const parsedPaths = parseCalls.map((c: unknown[]) => c[0] as string);
    expect(parsedPaths.some((p: string) => p.includes('build'))).toBe(false);
    expect(parsedPaths.some((p: string) => p.includes('app.ts'))).toBe(true);
  });

  it('handles multiple entities per file', () => {
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    writeFileSync(
      join(tempDir, 'src', 'multi.ts'),
      'class Foo {}\nfunction bar() {}',
    );

    const parseResults = new Map<string, readonly ParseResult[]>([
      [
        'multi.ts',
        [
          makeParsedResult({
            name: 'Foo',
            entityType: 'class',
            line: 1,
            metadata: { type: 'class', description: 'A class' },
          }),
          makeParsedResult({ name: 'bar', entityType: 'function', line: 2 }),
        ],
      ],
    ]);
    const registry = createMockParserRegistry(parseResults);
    const indexer = createIndexer(registry, dbManager);

    const result = indexer.index({ rootDir: tempDir });
    expect(result.totalEntities).toBe(2);
  });
});
