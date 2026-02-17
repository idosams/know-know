import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { createValidator } from '../validator.js';
import type { ValidationRule } from '../types.js';
import type { ParseResult } from '../../types/parse-result.js';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');

describe('createValidator', () => {
  it('returns a validator with a validate method', () => {
    const validator = createValidator();
    expect(typeof validator.validate).toBe('function');
  });

  it('validates a directory with valid annotations', () => {
    const validator = createValidator();
    const result = validator.validate(resolve(FIXTURES_DIR, 'valid.ts'));
    expect(result.fileCount).toBe(1);
    expect(result.errorCount).toBe(0);
    expect(result.isValid).toBe(true);
  });

  it('detects warnings in files with missing owner', () => {
    const validator = createValidator();
    const result = validator.validate(resolve(FIXTURES_DIR, 'no-owner.ts'));
    expect(result.fileCount).toBe(1);
    const ownerIssues = result.issues.filter((i) => i.rule === 'owner-present');
    expect(ownerIssues.length).toBeGreaterThan(0);
    expect(ownerIssues[0].severity).toBe('warning');
    // Still valid because warnings are not errors
    expect(result.isValid).toBe(true);
  });

  it('detects warnings for empty tags', () => {
    const validator = createValidator();
    const result = validator.validate(resolve(FIXTURES_DIR, 'empty-tags.ts'));
    const tagIssues = result.issues.filter((i) => i.rule === 'non-empty-tags');
    expect(tagIssues.length).toBeGreaterThan(0);
    expect(tagIssues[0].severity).toBe('warning');
  });

  it('detects short description warnings', () => {
    const validator = createValidator();
    const result = validator.validate(
      resolve(FIXTURES_DIR, 'missing-description.ts'),
    );
    const descIssues = result.issues.filter(
      (i) => i.rule === 'description-length',
    );
    expect(descIssues.length).toBeGreaterThan(0);
  });

  it('validates entire fixtures directory', () => {
    const validator = createValidator();
    const result = validator.validate(FIXTURES_DIR);
    expect(result.fileCount).toBeGreaterThan(0);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('filters by rule name', () => {
    const validator = createValidator();
    const result = validator.validate(FIXTURES_DIR, {
      ruleName: 'owner-present',
    });
    for (const issue of result.issues) {
      expect(issue.rule).toBe('owner-present');
    }
  });

  it('returns empty result for unknown rule name', () => {
    const validator = createValidator();
    const result = validator.validate(FIXTURES_DIR, {
      ruleName: 'nonexistent-rule',
    });
    expect(result.issues).toHaveLength(0);
    expect(result.fileCount).toBe(0);
  });

  it('accepts custom rules', () => {
    const customRule: ValidationRule = {
      name: 'custom-rule',
      description: 'Always produces a warning',
      severity: 'warning',
      check(parseResult: ParseResult) {
        return [
          {
            filePath: parseResult.filePath,
            line: parseResult.line,
            rule: 'custom-rule',
            message: 'Custom warning',
            severity: 'warning' as const,
          },
        ];
      },
    };

    const validator = createValidator([customRule]);
    const result = validator.validate(resolve(FIXTURES_DIR, 'valid.ts'));
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0].rule).toBe('custom-rule');
  });

  it('correctly counts errors and warnings', () => {
    const validator = createValidator();
    const result = validator.validate(FIXTURES_DIR);
    const manualErrors = result.issues.filter(
      (i) => i.severity === 'error',
    ).length;
    const manualWarnings = result.issues.filter(
      (i) => i.severity === 'warning',
    ).length;
    expect(result.errorCount).toBe(manualErrors);
    expect(result.warningCount).toBe(manualWarnings);
  });

  it('includes filePath and line in issues', () => {
    const validator = createValidator();
    const result = validator.validate(FIXTURES_DIR);
    for (const issue of result.issues) {
      expect(issue.filePath).toBeTruthy();
      expect(typeof issue.line).toBe('number');
      expect(issue.line).toBeGreaterThan(0);
    }
  });
});
