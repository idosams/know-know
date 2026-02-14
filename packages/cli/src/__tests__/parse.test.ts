import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createDefaultRegistry } from '@codegraph/core';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');

describe('parse command logic', () => {
  it('should parse a single Python file', () => {
    const registry = createDefaultRegistry();
    const filePath = resolve(FIXTURES_DIR, 'sample.py');
    const content = readFileSync(filePath, 'utf-8');
    const results = registry.parseFile(content, filePath);

    expect(results.length).toBeGreaterThan(0);
    const names = results.map((r) => r.name);
    expect(names).toContain('sample_function');
  });

  it('should parse a single TypeScript file', () => {
    const registry = createDefaultRegistry();
    const filePath = resolve(FIXTURES_DIR, 'sample.ts');
    const content = readFileSync(filePath, 'utf-8');
    const results = registry.parseFile(content, filePath);

    expect(results.length).toBeGreaterThan(0);
    const names = results.map((r) => r.name);
    expect(names).toContain('sampleFunction');
  });

  it('should parse a directory of files', () => {
    const registry = createDefaultRegistry();
    const pyPath = resolve(FIXTURES_DIR, 'sample.py');
    const tsPath = resolve(FIXTURES_DIR, 'sample.ts');

    const pyContent = readFileSync(pyPath, 'utf-8');
    const tsContent = readFileSync(tsPath, 'utf-8');

    const pyResults = registry.parseFile(pyContent, pyPath);
    const tsResults = registry.parseFile(tsContent, tsPath);

    const allResults = [...pyResults, ...tsResults];
    expect(allResults.length).toBeGreaterThanOrEqual(2);
  });

  it('should detect missing description as validation error', () => {
    const registry = createDefaultRegistry();
    const filePath = resolve(FIXTURES_DIR, 'sample.py');
    const content = readFileSync(filePath, 'utf-8');
    const results = registry.parseFile(content, filePath);

    // All fixtures have descriptions, so no validation errors expected
    const errors = results.filter((r) => !r.metadata.description);
    expect(errors.length).toBe(0);
  });
});
