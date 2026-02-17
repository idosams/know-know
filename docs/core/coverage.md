# Coverage Calculator

The coverage calculator measures what percentage of parseable source files in a project have `@knowgraph` annotations. It provides overall coverage and breakdowns by language, directory, and owner.

## Architecture

```
coverage/
  types.ts                 # CoverageResult, CoverageBreakdown, etc.
  coverage-calculator.ts   # Main calculation logic
  index.ts                 # Re-exports
```

The coverage flow:

```
Root directory
  --> collectParseableFiles() walks directory tree
    --> For each file:
        1. Determine language from extension
        2. Parse with parser registry
        3. Record hasAnnotation and entityCount
      --> Compute overall percentage
      --> Build breakdowns by language, directory, owner
        --> Return CoverageResult
```

## Types

### FileCoverageInfo

Per-file coverage data:

```typescript
export interface FileCoverageInfo {
  readonly filePath: string;       // Relative path from root
  readonly language: string;       // Inferred language (typescript, python, etc.)
  readonly hasAnnotation: boolean; // True if any @knowgraph entity found
  readonly entityCount: number;    // Number of annotated entities in the file
}
```

### CoverageBreakdown

Grouped coverage statistics:

```typescript
export interface CoverageBreakdown {
  readonly category: string;        // Group key (language name, directory path, owner)
  readonly annotatedCount: number;  // Files with annotations in this group
  readonly totalCount: number;      // Total files in this group
  readonly percentage: number;      // Rounded to one decimal place
}
```

### CoverageResult

Complete coverage report:

```typescript
export interface CoverageResult {
  readonly totalFiles: number;
  readonly annotatedFiles: number;
  readonly percentage: number;
  readonly byLanguage: readonly CoverageBreakdown[];
  readonly byDirectory: readonly CoverageBreakdown[];
  readonly byOwner: readonly CoverageBreakdown[];
  readonly files: readonly FileCoverageInfo[];
}
```

### CoverageOptions

```typescript
export interface CoverageOptions {
  readonly rootDir: string;
  readonly exclude?: readonly string[];
  readonly byDimension?: 'language' | 'directory' | 'owner' | 'type';
}
```

## Algorithm

### File Collection

The calculator walks the directory tree using `readdirSync` and `statSync`, skipping:

```typescript
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build',
  '__pycache__', '.venv', 'venv', 'coverage',
  '.next', '.tox',
]);
```

Hidden files (starting with `.`) are also skipped. Only files with parseable extensions are included:

```typescript
const PARSEABLE_EXTENSIONS = new Set([
  '.py', '.pyi', '.ts', '.tsx', '.js', '.jsx', '.mts', '.cts',
]);
```

### Language Mapping

```typescript
const EXTENSION_TO_LANGUAGE = {
  '.py': 'python',     '.pyi': 'python',
  '.ts': 'typescript',  '.tsx': 'typescript',
  '.js': 'javascript',  '.jsx': 'javascript',
  '.mts': 'typescript', '.cts': 'typescript',
};
```

### File Analysis

For each parseable file:

1. Read the file content
2. Parse it using `createDefaultRegistry().parseFile(content, filePath)`
3. Record whether any `ParseResult` entities were found
4. Count the number of entities

If reading or parsing fails, the file is recorded as having no annotations.

### Percentage Calculation

```typescript
function computePercentage(annotated: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((annotated / total) * 1000) / 10;
}
```

This produces one decimal place of precision (e.g., `66.7`, `100.0`, `0.0`).

### Breakdown Dimensions

#### By Language

Groups files by their inferred language and computes per-group coverage.

```
typescript: 5 annotated / 8 total = 62.5%
python:     2 annotated / 4 total = 50.0%
javascript: 1 annotated / 1 total = 100.0%
```

#### By Directory

Groups files by their parent directory (relative to `rootDir`). Files in the root are grouped under `(root)`.

```
src/parsers:  4 annotated / 5 total = 80.0%
src/indexer:  3 annotated / 4 total = 75.0%
(root):       1 annotated / 2 total = 50.0%
```

#### By Owner

Owner breakdown requires a second pass. For annotated files, the calculator re-parses the file to extract the `owner` field from each entity's metadata. If no owner is specified, entities are grouped under `(no owner)`. Unannotated files always contribute to `(no owner)`.

```
auth-team:     5 annotated / 5 total = 100.0%
platform-team: 3 annotated / 4 total = 75.0%
(no owner):    0 annotated / 3 total = 0.0%
```

### Sorting

All breakdowns are sorted by percentage in descending order, so the highest-coverage groups appear first.

## Usage

```typescript
import { calculateCoverage } from '@knowgraph/core';

const result = calculateCoverage({
  rootDir: '/path/to/project',
  exclude: ['vendor', 'generated'],
});

console.log(`Overall: ${result.percentage}%`);
console.log(`${result.annotatedFiles} of ${result.totalFiles} files annotated`);

for (const lang of result.byLanguage) {
  console.log(`  ${lang.category}: ${lang.percentage}% (${lang.annotatedCount}/${lang.totalCount})`);
}
```

## Exports

```typescript
import {
  calculateCoverage,
  type CoverageBreakdown,
  type CoverageOptions,
  type CoverageResult,
  type FileCoverageInfo,
} from '@knowgraph/core';
```

Source files:
- `packages/core/src/coverage/coverage-calculator.ts`
- `packages/core/src/coverage/types.ts`
