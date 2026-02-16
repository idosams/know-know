import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve, join } from 'node:path';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import {
  createDefaultRegistry,
  createDatabaseManager,
  createIndexer,
  createQueryEngine,
} from '@knowgraph/core';
import type { DatabaseManager } from '@knowgraph/core';
import { formatTable, formatJson } from '../utils/format.js';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');
const TEMP_DIR = resolve(__dirname, '.tmp-query-test');

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

let dbManager: DatabaseManager;

beforeAll(() => {
  mkdirSync(TEMP_DIR, { recursive: true });
  const dbPath = join(TEMP_DIR, 'knowgraph.db');

  const registry = createDefaultRegistry();
  const adapter = createAdapter(registry);
  dbManager = createDatabaseManager(dbPath);
  dbManager.initialize();

  const indexer = createIndexer(adapter, dbManager);
  indexer.index({
    rootDir: FIXTURES_DIR,
    exclude: [],
  });
});

afterAll(() => {
  dbManager.close();
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
});

describe('query command logic', () => {
  it('should return results for a search term', () => {
    const engine = createQueryEngine(dbManager);
    const result = engine.search({ query: 'sample' });

    expect(result.entities.length).toBeGreaterThan(0);
  });

  it('should filter by entity type', () => {
    const engine = createQueryEngine(dbManager);
    const result = engine.search({ type: 'function' });

    for (const entity of result.entities) {
      expect(entity.entityType).toBe('function');
    }
  });

  it('should format results as table', () => {
    const engine = createQueryEngine(dbManager);
    const result = engine.search({ query: 'sample' });

    const table = formatTable(result.entities);
    expect(table).toContain('Name');
    expect(table).toContain('Type');
    expect(table).toContain('Owner');
  });

  it('should format results as JSON', () => {
    const engine = createQueryEngine(dbManager);
    const result = engine.search({ query: 'sample' });

    const json = formatJson(result.entities, true);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
  });
});
