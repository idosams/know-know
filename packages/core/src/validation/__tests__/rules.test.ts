import { describe, it, expect } from 'vitest';
import type { ParseResult } from '../../types/parse-result.js';
import {
  createRequiredFieldsRule,
  createValidStatusRule,
  createValidTypeRule,
  createNonEmptyTagsRule,
  createOwnerPresentRule,
  createDescriptionLengthRule,
} from '../rules.js';

function makeParseResult(overrides: Partial<ParseResult> = {}): ParseResult {
  return {
    name: 'testEntity',
    filePath: '/test/file.ts',
    line: 1,
    column: 1,
    language: 'typescript',
    entityType: 'function',
    metadata: {
      type: 'function',
      description: 'A valid description for testing purposes',
      owner: 'test-team',
      status: 'stable',
      tags: ['testing'],
    },
    rawDocstring: '',
    ...overrides,
  };
}

describe('createRequiredFieldsRule', () => {
  const rule = createRequiredFieldsRule();

  it('has correct name and severity', () => {
    expect(rule.name).toBe('required-fields');
    expect(rule.severity).toBe('error');
  });

  it('returns no issues for valid parse result', () => {
    const result = makeParseResult();
    const issues = rule.check(result);
    expect(issues).toHaveLength(0);
  });

  it('returns error when description is empty', () => {
    const result = makeParseResult({
      metadata: {
        type: 'function',
        description: '',
        owner: 'test-team',
      },
    });
    const issues = rule.check(result);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('required-fields');
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('description');
  });
});

describe('createValidStatusRule', () => {
  const rule = createValidStatusRule();

  it('has correct name and severity', () => {
    expect(rule.name).toBe('valid-status');
    expect(rule.severity).toBe('error');
  });

  it('returns no issues for valid status', () => {
    const issues = rule.check(makeParseResult());
    expect(issues).toHaveLength(0);
  });

  it('returns no issues when status is undefined', () => {
    const result = makeParseResult({
      metadata: {
        type: 'function',
        description: 'A valid description',
      },
    });
    const issues = rule.check(result);
    expect(issues).toHaveLength(0);
  });

  it('returns error for invalid status', () => {
    const result = makeParseResult({
      metadata: {
        type: 'function',
        description: 'A valid description',
        status: 'active' as 'stable',
      },
    });
    const issues = rule.check(result);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('valid-status');
    expect(issues[0].message).toContain('active');
  });
});

describe('createValidTypeRule', () => {
  const rule = createValidTypeRule();

  it('has correct name and severity', () => {
    expect(rule.name).toBe('valid-type');
    expect(rule.severity).toBe('error');
  });

  it('returns no issues for valid type', () => {
    const issues = rule.check(makeParseResult());
    expect(issues).toHaveLength(0);
  });

  it('returns error for invalid type', () => {
    const result = makeParseResult({
      entityType: 'widget' as 'function',
      metadata: {
        type: 'widget' as 'function',
        description: 'A valid description',
      },
    });
    const issues = rule.check(result);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('valid-type');
    expect(issues[0].message).toContain('widget');
  });
});

describe('createNonEmptyTagsRule', () => {
  const rule = createNonEmptyTagsRule();

  it('has correct name and severity', () => {
    expect(rule.name).toBe('non-empty-tags');
    expect(rule.severity).toBe('warning');
  });

  it('returns no issues when tags are present', () => {
    const issues = rule.check(makeParseResult());
    expect(issues).toHaveLength(0);
  });

  it('returns no issues when tags are undefined', () => {
    const result = makeParseResult({
      metadata: {
        type: 'function',
        description: 'A valid description',
      },
    });
    const issues = rule.check(result);
    expect(issues).toHaveLength(0);
  });

  it('returns warning when tags array is empty', () => {
    const result = makeParseResult({
      metadata: {
        type: 'function',
        description: 'A valid description',
        tags: [],
      },
    });
    const issues = rule.check(result);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('non-empty-tags');
    expect(issues[0].severity).toBe('warning');
  });
});

describe('createOwnerPresentRule', () => {
  const rule = createOwnerPresentRule();

  it('has correct name and severity', () => {
    expect(rule.name).toBe('owner-present');
    expect(rule.severity).toBe('warning');
  });

  it('returns no issues when owner is present', () => {
    const issues = rule.check(makeParseResult());
    expect(issues).toHaveLength(0);
  });

  it('returns warning when owner is missing', () => {
    const result = makeParseResult({
      metadata: {
        type: 'function',
        description: 'A valid description',
      },
    });
    const issues = rule.check(result);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('owner-present');
    expect(issues[0].severity).toBe('warning');
  });
});

describe('createDescriptionLengthRule', () => {
  const rule = createDescriptionLengthRule();

  it('has correct name and severity', () => {
    expect(rule.name).toBe('description-length');
    expect(rule.severity).toBe('warning');
  });

  it('returns no issues for long description', () => {
    const issues = rule.check(makeParseResult());
    expect(issues).toHaveLength(0);
  });

  it('returns warning for short description', () => {
    const result = makeParseResult({
      metadata: {
        type: 'function',
        description: 'Short',
      },
    });
    const issues = rule.check(result);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('description-length');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('5 chars');
  });

  it('returns no issues for exactly 10 char description', () => {
    const result = makeParseResult({
      metadata: {
        type: 'function',
        description: '1234567890',
      },
    });
    const issues = rule.check(result);
    expect(issues).toHaveLength(0);
  });
});
