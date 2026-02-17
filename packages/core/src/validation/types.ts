/**
 * @knowgraph
 * type: interface
 * description: Immutable types for the annotation validation system
 * owner: knowgraph-core
 * status: experimental
 * tags: [validation, types, interface]
 * context:
 *   business_goal: Define contracts for pluggable validation rules and results
 *   domain: validation
 */
import type { ParseResult } from '../types/parse-result.js';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  readonly filePath: string;
  readonly line: number;
  readonly rule: string;
  readonly message: string;
  readonly severity: ValidationSeverity;
}

export interface ValidationResult {
  readonly issues: readonly ValidationIssue[];
  readonly fileCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly isValid: boolean;
}

export interface ValidationRule {
  readonly name: string;
  readonly description: string;
  readonly severity: ValidationSeverity;
  check(parseResult: ParseResult): readonly ValidationIssue[];
}
