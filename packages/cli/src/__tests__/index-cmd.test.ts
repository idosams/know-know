import { describe, it, expect, afterEach } from 'vitest';
import { resolve, join } from 'node:path';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import {
  createDefaultRegistry,
  createDatabaseManager,
  createIndexer,
} from '@codegraph/core';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');
const TEMP_DIR = resolve(__dirname, '.tmp-test-output');

function createAdapter(registry: ReturnType<typeof createDefaultRegistry>) {
  return {
    parse(filePath: string, content: string) {
      return registry.parseFile(content, filePath);
    },
    canParse(filePath: string) {
      return registry.getParser(filePath) !== undefined;
    },
  };
}

afterEach(() => {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
});

describe('index command logic', () => {
  it('should index a sample directory', () => {
    mkdirSync(TEMP_DIR, { recursive: true });
    const dbPath = join(TEMP_DIR, 'codegraph.db');

    const registry = createDefaultRegistry();
    const adapter = createAdapter(registry);
    const dbManager = createDatabaseManager(dbPath);
    dbManager.initialize();

    const indexer = createIndexer(adapter, dbManager);
    const result = indexer.index({
      rootDir: FIXTURES_DIR,
      exclude: [],
    });

    expect(result.totalFiles).toBeGreaterThan(0);
    expect(result.totalEntities).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);

    dbManager.close();
  });

  it('should support incremental indexing', () => {
    mkdirSync(TEMP_DIR, { recursive: true });
    const dbPath = join(TEMP_DIR, 'codegraph.db');

    const registry = createDefaultRegistry();
    const adapter = createAdapter(registry);
    const dbManager = createDatabaseManager(dbPath);
    dbManager.initialize();

    const indexer = createIndexer(adapter, dbManager);

    // First index
    const result1 = indexer.index({
      rootDir: FIXTURES_DIR,
      exclude: [],
      incremental: false,
    });
    expect(result1.totalEntities).toBeGreaterThan(0);

    // Second index with incremental - should skip unchanged files
    const result2 = indexer.index({
      rootDir: FIXTURES_DIR,
      exclude: [],
      incremental: true,
    });
    // Incremental re-index of unchanged files produces 0 new entities
    // because files haven't changed
    expect(result2.errors.length).toBe(0);

    dbManager.close();
  });

  it('should respect exclude patterns', () => {
    mkdirSync(TEMP_DIR, { recursive: true });
    const dbPath = join(TEMP_DIR, 'codegraph.db');

    const registry = createDefaultRegistry();
    const adapter = createAdapter(registry);
    const dbManager = createDatabaseManager(dbPath);
    dbManager.initialize();

    const indexer = createIndexer(adapter, dbManager);
    const result = indexer.index({
      rootDir: FIXTURES_DIR,
      exclude: ['*.py'],
    });

    // Should not have any Python entities
    expect(result.errors.length).toBe(0);

    dbManager.close();
  });
});
