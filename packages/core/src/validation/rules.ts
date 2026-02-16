/**
 * @knowgraph
 * type: module
 * description: Pure factory functions that create individual annotation validation rules
 * owner: knowgraph-core
 * status: experimental
 * tags: [validation, rules, factory]
 * context:
 *   business_goal: Provide pluggable validation checks for knowgraph annotations
 *   domain: validation
 */
import type { ParseResult } from '../types/parse-result.js';
import { EntityTypeSchema, StatusSchema } from '../types/entity.js';
import type { ValidationIssue, ValidationRule } from './types.js';

function createIssue(
  parseResult: ParseResult,
  rule: string,
  message: string,
  severity: 'error' | 'warning',
): ValidationIssue {
  return {
    filePath: parseResult.filePath,
    line: parseResult.line,
    rule,
    message,
    severity,
  };
}

export function createRequiredFieldsRule(): ValidationRule {
  return {
    name: 'required-fields',
    description: 'description must be present',
    severity: 'error',
    check(parseResult: ParseResult): readonly ValidationIssue[] {
      const issues: ValidationIssue[] = [];
      if (!parseResult.metadata.description) {
        issues.push(
          createIssue(
            parseResult,
            'required-fields',
            'Missing required field: description',
            'error',
          ),
        );
      }
      return issues;
    },
  };
}

export function createValidStatusRule(): ValidationRule {
  return {
    name: 'valid-status',
    description: 'status must be experimental, stable, or deprecated',
    severity: 'error',
    check(parseResult: ParseResult): readonly ValidationIssue[] {
      const { status } = parseResult.metadata;
      if (status === undefined) {
        return [];
      }
      const result = StatusSchema.safeParse(status);
      if (!result.success) {
        return [
          createIssue(
            parseResult,
            'valid-status',
            `Invalid status "${status}". Must be one of: experimental, stable, deprecated`,
            'error',
          ),
        ];
      }
      return [];
    },
  };
}

export function createValidTypeRule(): ValidationRule {
  return {
    name: 'valid-type',
    description: 'type must be a valid entity type',
    severity: 'error',
    check(parseResult: ParseResult): readonly ValidationIssue[] {
      const { type } = parseResult.metadata;
      const result = EntityTypeSchema.safeParse(type);
      if (!result.success) {
        return [
          createIssue(
            parseResult,
            'valid-type',
            `Invalid type "${type}". Must be one of: ${EntityTypeSchema.options.join(', ')}`,
            'error',
          ),
        ];
      }
      return [];
    },
  };
}

export function createNonEmptyTagsRule(): ValidationRule {
  return {
    name: 'non-empty-tags',
    description: 'tags should not be empty when present',
    severity: 'warning',
    check(parseResult: ParseResult): readonly ValidationIssue[] {
      const { tags } = parseResult.metadata;
      if (tags !== undefined && tags.length === 0) {
        return [
          createIssue(
            parseResult,
            'non-empty-tags',
            'Tags array is present but empty',
            'warning',
          ),
        ];
      }
      return [];
    },
  };
}

export function createOwnerPresentRule(): ValidationRule {
  return {
    name: 'owner-present',
    description: 'owner should be present',
    severity: 'warning',
    check(parseResult: ParseResult): readonly ValidationIssue[] {
      if (!parseResult.metadata.owner) {
        return [
          createIssue(
            parseResult,
            'owner-present',
            'Missing recommended field: owner',
            'warning',
          ),
        ];
      }
      return [];
    },
  };
}

export function createDescriptionLengthRule(): ValidationRule {
  return {
    name: 'description-length',
    description: 'description should be at least 10 characters',
    severity: 'warning',
    check(parseResult: ParseResult): readonly ValidationIssue[] {
      const { description } = parseResult.metadata;
      if (description && description.length < 10) {
        return [
          createIssue(
            parseResult,
            'description-length',
            `Description is too short (${description.length} chars). Minimum recommended: 10`,
            'warning',
          ),
        ];
      }
      return [];
    },
  };
}

export function createAllDefaultRules(): readonly ValidationRule[] {
  return [
    createRequiredFieldsRule(),
    createValidStatusRule(),
    createValidTypeRule(),
    createNonEmptyTagsRule(),
    createOwnerPresentRule(),
    createDescriptionLengthRule(),
  ];
}
