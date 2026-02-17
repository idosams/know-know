# Validation Engine

The validation engine checks `@knowgraph` annotations for correctness and completeness. It uses a pluggable rule system where each rule is an independent check that can be individually enabled, filtered, or replaced with custom rules.

## Architecture

```
validation/
  types.ts      # ValidationRule, ValidationIssue, ValidationResult interfaces
  rules.ts      # Built-in rule factory functions
  validator.ts  # Validator that orchestrates scanning and rule execution
  index.ts      # Re-exports
```

The validation flow:

```
Directory path
  --> collectFiles() walks directory tree
    --> Filter to parsable extensions
      --> Parse each file with parser registry
        --> For each ParseResult, run all active validation rules
          --> Collect ValidationIssues
            --> Build ValidationResult with counts
```

## Types

### ValidationSeverity

```typescript
export type ValidationSeverity = 'error' | 'warning';
```

- **error**: The annotation is invalid and must be fixed. Errors cause `isValid` to be `false`.
- **warning**: The annotation is technically valid but could be improved. Warnings do not affect `isValid`.

### ValidationIssue

```typescript
export interface ValidationIssue {
  readonly filePath: string;
  readonly line: number;
  readonly rule: string;       // Rule name (e.g., 'required-fields')
  readonly message: string;    // Human-readable description
  readonly severity: ValidationSeverity;
}
```

### ValidationResult

```typescript
export interface ValidationResult {
  readonly issues: readonly ValidationIssue[];
  readonly fileCount: number;      // Number of files with annotations
  readonly errorCount: number;     // Count of 'error' severity issues
  readonly warningCount: number;   // Count of 'warning' severity issues
  readonly isValid: boolean;       // true if errorCount === 0
}
```

### ValidationRule

The interface for pluggable rules:

```typescript
export interface ValidationRule {
  readonly name: string;
  readonly description: string;
  readonly severity: ValidationSeverity;
  check(parseResult: ParseResult): readonly ValidationIssue[];
}
```

Each rule receives a single `ParseResult` and returns zero or more issues.

## Built-in Rules

All rules are created via factory functions that return `ValidationRule` objects.

### required-fields (error)

```typescript
createRequiredFieldsRule()
```

Checks that the `description` field is present and non-empty.

| Condition | Result |
|-----------|--------|
| `description` is falsy | Error: "Missing required field: description" |

### valid-status (error)

```typescript
createValidStatusRule()
```

Validates that if a `status` field is present, it is one of the allowed values.

| Condition | Result |
|-----------|--------|
| `status` is undefined | No issue (status is optional) |
| `status` is `experimental`, `stable`, or `deprecated` | No issue |
| `status` is anything else | Error: "Invalid status \"{value}\". Must be one of: experimental, stable, deprecated" |

Uses `StatusSchema.safeParse()` for validation.

### valid-type (error)

```typescript
createValidTypeRule()
```

Validates that the `type` field is a valid entity type.

| Condition | Result |
|-----------|--------|
| `type` is a valid EntityType | No issue |
| `type` is anything else | Error: "Invalid type \"{value}\". Must be one of: module, class, function, ..." |

Uses `EntityTypeSchema.safeParse()` for validation.

### non-empty-tags (warning)

```typescript
createNonEmptyTagsRule()
```

Warns when a `tags` array is present but empty.

| Condition | Result |
|-----------|--------|
| `tags` is undefined | No issue |
| `tags` has one or more items | No issue |
| `tags` is an empty array | Warning: "Tags array is present but empty" |

### owner-present (warning)

```typescript
createOwnerPresentRule()
```

Warns when the `owner` field is missing.

| Condition | Result |
|-----------|--------|
| `owner` is present | No issue |
| `owner` is falsy | Warning: "Missing recommended field: owner" |

### description-length (warning)

```typescript
createDescriptionLengthRule()
```

Warns when the description is shorter than 10 characters.

| Condition | Result |
|-----------|--------|
| `description` is 10+ characters | No issue |
| `description` is 1-9 characters | Warning: "Description is too short ({N} chars). Minimum recommended: 10" |

### All Default Rules

```typescript
export function createAllDefaultRules(): readonly ValidationRule[] {
  return [
    createRequiredFieldsRule(),    // error
    createValidStatusRule(),       // error
    createValidTypeRule(),         // error
    createNonEmptyTagsRule(),      // warning
    createOwnerPresentRule(),      // warning
    createDescriptionLengthRule(), // warning
  ];
}
```

## Validator

### Creating a Validator

```typescript
export function createValidator(customRules?: readonly ValidationRule[]): Validator;
```

- If `customRules` is provided, only those rules are used (default rules are not included).
- If omitted, all six default rules are used.

### ValidateOptions

```typescript
export interface ValidateOptions {
  readonly strict?: boolean;     // Reserved for future use
  readonly ruleName?: string;    // Only run a specific rule
}
```

### Validator Interface

```typescript
export interface Validator {
  validate(rootDir: string, options?: ValidateOptions): ValidationResult;
}
```

The `rootDir` can be either a directory (recursively scanned) or a single file path.

### Validation Workflow

1. **Filter rules**: If `options.ruleName` is set, only run rules with that name. If no rule matches, return an empty result.

2. **Create parser registry**: Uses `createDefaultRegistry()` to get TypeScript and Python parsers.

3. **Collect files**: Recursively walk the directory tree, skipping:
   - Hidden files/directories (starting with `.`)
   - Standard skip directories: `node_modules`, `.git`, `dist`, `build`, `__pycache__`, `.venv`, `venv`, `coverage`

4. **Filter by extension**: Only process files with parsable extensions: `.py`, `.ts`, `.tsx`, `.js`, `.jsx`.

5. **Parse files**: For each file, call `registry.parseFile(content, filePath)`.

6. **Run rules**: For each `ParseResult`, run all active validation rules and collect issues.

7. **Build result**: Count errors and warnings, set `isValid = (errorCount === 0)`.

## Creating Custom Rules

You can define custom validation rules and pass them to `createValidator()`:

```typescript
import { createValidator, type ValidationRule, type ParseResult } from '@knowgraph/core';

const requireTagsRule: ValidationRule = {
  name: 'require-tags',
  description: 'All annotations must have at least one tag',
  severity: 'error',
  check(parseResult: ParseResult) {
    const tags = parseResult.metadata.tags;
    if (!tags || tags.length === 0) {
      return [{
        filePath: parseResult.filePath,
        line: parseResult.line,
        rule: 'require-tags',
        message: 'Annotations must have at least one tag',
        severity: 'error',
      }];
    }
    return [];
  },
};

// Use only custom rules
const validator = createValidator([requireTagsRule]);
const result = validator.validate('/path/to/project');
```

To combine default rules with custom ones:

```typescript
import { createValidator, createAllDefaultRules } from '@knowgraph/core';

const validator = createValidator([
  ...createAllDefaultRules(),
  requireTagsRule,
]);
```

## Exports

```typescript
import {
  // Types
  type ValidationSeverity,
  type ValidationIssue,
  type ValidationResult,
  type ValidationRule,
  type ValidateOptions,
  type Validator,
  // Rule factories
  createRequiredFieldsRule,
  createValidStatusRule,
  createValidTypeRule,
  createNonEmptyTagsRule,
  createOwnerPresentRule,
  createDescriptionLengthRule,
  createAllDefaultRules,
  // Validator factory
  createValidator,
} from '@knowgraph/core';
```

Source files:
- `packages/core/src/validation/types.ts`
- `packages/core/src/validation/rules.ts`
- `packages/core/src/validation/validator.ts`
