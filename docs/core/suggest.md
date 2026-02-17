# Suggestion Engine

The suggestion engine ranks unannotated files by annotation priority, helping developers find the most impactful files to annotate next. It uses a scoring system based on heuristics like file size, import count, and whether the file is an entry point.

## Architecture

```
suggest/
  types.ts              # FileSuggestion, SuggestionResult, etc.
  suggestion-engine.ts  # Scoring and ranking logic
  index.ts              # Re-exports
```

The suggestion flow:

```
Root directory
  --> collectFiles() walks directory tree
    --> analyzeFile() reads each file, counts lines/imports, checks for annotation
      --> shouldExclude() filters out test files, config files, fixtures, annotated files
        --> scoreFile() assigns a numeric score and reasons
          --> Sort by score descending
            --> Return top N suggestions
```

## Types

### SuggestionReason

Explains why a file was scored highly:

```typescript
export type SuggestionReason =
  | 'entry-point'       // File is named index.ts, main.py, etc.
  | 'large-file'        // File has 100+ lines
  | 'many-imports'      // File has 5+ import statements
  | 'exported-module'   // File is inside a src/ directory
  | 'uncovered';        // Default reason when no other heuristics match
```

### FileSuggestion

A single file recommendation:

```typescript
export interface FileSuggestion {
  readonly filePath: string;                    // Relative path from root
  readonly score: number;                       // Numeric priority score
  readonly reasons: readonly SuggestionReason[]; // Why this file was ranked
  readonly language: string;                    // Inferred language
  readonly lineCount: number;                   // Total lines in the file
}
```

### SuggestionOptions

```typescript
export interface SuggestionOptions {
  readonly limit?: number;    // Maximum suggestions to return (default: 10)
  readonly rootDir: string;   // Project root directory
}
```

### SuggestionResult

```typescript
export interface SuggestionResult {
  readonly suggestions: readonly FileSuggestion[];
  readonly totalUnannotated: number;  // Total eligible unannotated files
  readonly totalFiles: number;        // Total parseable files found
}
```

## Scoring Heuristics

Each file receives a numeric score based on the following criteria. Points are additive.

### Entry Point (+100)

Files with names that indicate they are entry points:

```typescript
const ENTRY_POINT_NAMES = new Set([
  'index.ts', 'index.js', 'index.tsx', 'index.jsx',
  'main.ts', 'main.js', 'app.ts', 'app.js',
  'main.py', 'app.py', '__init__.py',
  'server.ts', 'server.js',
]);
```

Reason: `'entry-point'`

### Large File (+50 or +100)

| Condition | Points |
|-----------|--------|
| 200+ lines | +100 |
| 100-199 lines | +50 |
| Under 100 lines | +0 |

Reason: `'large-file'`

### In src/ Directory (+20)

Files located under a `src/` directory path.

Reason: `'exported-module'`

### Many Imports (+30 or +60)

Import count is determined by matching lines against:

```typescript
const importRegex = /^(?:import\s|from\s|const\s+\w+\s*=\s*require\()/gm;
```

| Condition | Points |
|-----------|--------|
| 10+ imports | +60 |
| 5-9 imports | +30 |
| Under 5 imports | +0 |

Reason: `'many-imports'`

### Primary Language (+10)

Files with extensions `.ts`, `.tsx`, or `.py` receive a small bonus.

### Default Reason

If no other heuristics matched (score from heuristics is 0), the file gets the `'uncovered'` reason.

## Exclusion Filters

The following files are excluded from suggestions entirely:

### Test Files

```typescript
function isTestFile(fileName: string): boolean {
  return (
    fileName.includes('.test.') ||
    fileName.includes('.spec.') ||
    fileName.includes('__test__') ||
    fileName.startsWith('test_')
  );
}
```

### Config Files

```typescript
const CONFIG_PATTERNS = new Set([
  'eslint.config.js', 'eslint.config.ts',
  'vitest.config.ts', 'vitest.config.js',
  'jest.config.ts', 'jest.config.js',
  'tsconfig.json', 'babel.config.js',
  'webpack.config.js', 'rollup.config.js',
  'vite.config.ts', 'vite.config.js',
  'prettier.config.js', 'postcss.config.js',
  'tailwind.config.js', 'tailwind.config.ts',
]);
```

Files starting with `.` are also treated as config files.

### Fixture Files

Files under `/fixtures/`, `/__fixtures__/`, or `/fixture/` directories.

### Already Annotated Files

Files that already contain the `@knowgraph` marker anywhere in their content.

### Skipped Directories

```typescript
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build',
  '__pycache__', '.venv', 'venv', 'coverage',
  '.next', '.knowgraph',
]);
```

## Ranking

After scoring, suggestions are sorted by score in descending order. Only the top `limit` results are returned (default: 10).

Example ranking:

```
Score  File              Reasons
260    src/index.ts      entry-point, large-file, many-imports, exported-module
130    src/auth.ts       large-file, many-imports, exported-module
 80    src/utils.ts      large-file, exported-module
 30    lib/helper.ts     many-imports
 10    config.py         (uncovered)
```

## SuggestionEngine Interface

```typescript
export interface SuggestionEngine {
  readonly suggest: (options: SuggestionOptions) => SuggestionResult;
}
```

Created via `createSuggestionEngine(registry)`, where `registry` is a `ParserRegistry`. Note: the current implementation does not use the registry for parsing -- it relies on the `@knowgraph` string marker to detect annotated files. The registry parameter is reserved for future use.

## Usage

```typescript
import { createSuggestionEngine, createDefaultRegistry } from '@knowgraph/core';

const registry = createDefaultRegistry();
const engine = createSuggestionEngine(registry);

const result = engine.suggest({
  rootDir: '/path/to/project',
  limit: 5,
});

console.log(`${result.totalUnannotated} unannotated files out of ${result.totalFiles} total`);

for (const suggestion of result.suggestions) {
  console.log(`  ${suggestion.filePath} (score: ${suggestion.score})`);
  console.log(`    Reasons: ${suggestion.reasons.join(', ')}`);
  console.log(`    ${suggestion.lineCount} lines, ${suggestion.language}`);
}
```

## Exports

```typescript
import {
  createSuggestionEngine,
  type SuggestionReason,
  type FileSuggestion,
  type SuggestionOptions,
  type SuggestionResult,
} from '@knowgraph/core';
```

Source files:
- `packages/core/src/suggest/suggestion-engine.ts`
- `packages/core/src/suggest/types.ts`
