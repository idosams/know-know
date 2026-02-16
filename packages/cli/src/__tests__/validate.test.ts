import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runValidate } from '../commands/validate.js';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');

describe('validate command', () => {
  it('should validate files with correct annotations and find no errors', () => {
    const samplePath = resolve(FIXTURES_DIR, 'sample.ts');
    const summary = runValidate({
      path: samplePath,
      strict: false,
      format: 'text',
    });

    expect(summary.filesScanned).toBe(1);
    expect(summary.entitiesFound).toBeGreaterThan(0);
    expect(summary.validEntities).toBeGreaterThan(0);
    expect(summary.errors).toHaveLength(0);
  });

  it('should detect invalid annotations with bad status value', () => {
    const invalidPath = resolve(FIXTURES_DIR, 'invalid-annotations.ts');
    const summary = runValidate({
      path: invalidPath,
      strict: false,
      format: 'text',
    });

    expect(summary.filesScanned).toBe(1);
    expect(summary.errors.length).toBeGreaterThan(0);

    const statusErrors = summary.errors.filter((e) =>
      e.message.includes('status'),
    );
    expect(statusErrors.length).toBeGreaterThan(0);
  });

  it('should produce warnings for missing recommended fields', () => {
    const missingPath = resolve(FIXTURES_DIR, 'missing-fields.ts');
    const summary = runValidate({
      path: missingPath,
      strict: false,
      format: 'text',
    });

    expect(summary.filesScanned).toBe(1);
    expect(summary.errors).toHaveLength(0);
    expect(summary.warnings.length).toBeGreaterThan(0);

    const warningMessages = summary.warnings.map((w) => w.message);
    expect(warningMessages).toContain('Missing recommended field: owner');
    expect(warningMessages).toContain('Missing recommended field: status');
    expect(warningMessages).toContain('Missing recommended field: tags');
  });

  it('should treat warnings as errors in strict mode', () => {
    const missingPath = resolve(FIXTURES_DIR, 'missing-fields.ts');
    const summary = runValidate({
      path: missingPath,
      strict: true,
      format: 'text',
    });

    expect(summary.filesScanned).toBe(1);
    expect(summary.errors.length).toBeGreaterThan(0);
    expect(summary.warnings).toHaveLength(0);

    const errorMessages = summary.errors.map((e) => e.message);
    expect(errorMessages).toContain('Missing recommended field: owner');
  });

  it('should produce JSON output format', () => {
    const samplePath = resolve(FIXTURES_DIR, 'sample.ts');
    const summary = runValidate({
      path: samplePath,
      strict: false,
      format: 'json',
    });

    const jsonString = JSON.stringify(summary, null, 2);
    const parsed = JSON.parse(jsonString);

    expect(parsed.filesScanned).toBe(1);
    expect(parsed.entitiesFound).toBeGreaterThan(0);
    expect(parsed.validEntities).toBeGreaterThan(0);
    expect(Array.isArray(parsed.errors)).toBe(true);
    expect(Array.isArray(parsed.warnings)).toBe(true);
  });

  it('should validate a directory of files', () => {
    const summary = runValidate({
      path: FIXTURES_DIR,
      strict: false,
      format: 'text',
    });

    expect(summary.filesScanned).toBeGreaterThanOrEqual(2);
    expect(summary.entitiesFound).toBeGreaterThan(0);
  });

  it('should return error for non-existent path', () => {
    const summary = runValidate({
      path: '/non/existent/path',
      strict: false,
      format: 'text',
    });

    expect(summary.errors.length).toBeGreaterThan(0);
    expect(summary.errors[0].message).toContain('Path not found');
  });

  it('should validate Python files with correct annotations', () => {
    const pyPath = resolve(FIXTURES_DIR, 'sample.py');
    const summary = runValidate({
      path: pyPath,
      strict: false,
      format: 'text',
    });

    expect(summary.filesScanned).toBe(1);
    expect(summary.entitiesFound).toBeGreaterThan(0);
    expect(summary.errors).toHaveLength(0);
  });
});
