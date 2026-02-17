# Contributing to KnowGraph

This guide covers everything you need to set up the development environment, understand the project structure, and submit changes.

## Prerequisites

- **Node.js** >= 20
- **pnpm** 9.15+ (package manager)
- **Git**

## Development Setup

```bash
# Clone the repository
git clone https://github.com/idosams/know-know.git
cd know-know

# Install dependencies
pnpm install

# Build all packages
pnpm turbo build

# Run all tests
pnpm turbo test

# Lint
pnpm turbo lint

# Type-check
pnpm turbo typecheck
```

All four checks (build, test, lint, typecheck) must pass before creating a PR.

## Monorepo Structure

KnowGraph is a pnpm workspace monorepo managed by [Turborepo](https://turbo.build/). It contains three packages:

```
packages/
  core/        @knowgraph/core      Parsers, indexer, query engine, validation, coverage, types
  cli/         @knowgraph/cli       Commander.js CLI tool
  mcp-server/  @knowgraph/mcp-server  MCP protocol server for AI tool integration
```

### Turborepo Task Graph

Defined in `turbo.json`:

| Task | Depends On | Outputs |
|------|-----------|---------|
| `build` | `^build` (upstream packages first) | `dist/**` |
| `test` | `build` | - |
| `lint` | - | - |
| `typecheck` | `^build` | - |
| `clean` | - (no cache) | - |

The `^build` dependency means `@knowgraph/cli` will build `@knowgraph/core` first, since CLI depends on core.

### Workspace Dependencies

Packages reference each other using pnpm workspace protocol:

```json
{
  "dependencies": {
    "@knowgraph/core": "workspace:*"
  }
}
```

## Git Workflow

### Branch Strategy

**Never push directly to `main`.** All changes go through pull requests.

- `main` -- protected branch, production-ready, only updated via merged PRs
- Feature branches -- all development happens here

### Branch Naming

Format: `<type>/<short-description>`

| Type | Purpose |
|------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `refactor/` | Code restructuring |
| `docs/` | Documentation changes |
| `test/` | Test additions/changes |
| `chore/` | Build, tooling, config |
| `perf/` | Performance improvements |
| `ci/` | CI/CD changes |

Examples: `feat/add-go-parser`, `fix/query-pagination`, `docs/annotation-guide`

### Workflow

```bash
# 1. Create a feature branch from main
git checkout -b feat/my-feature main

# 2. Make your changes and commit
git add <files>
git commit -m "feat: add my feature"

# 3. Push the branch
git push -u origin feat/my-feature

# 4. Create a PR
gh pr create
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

<optional body>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

Examples:
```
feat: add Go language parser
fix: handle empty YAML blocks in metadata extractor
refactor: extract database schema to separate module
docs: update annotation guide with Python examples
test: add coverage for incremental indexing
chore: bump vitest to v3.1
```

## Code Style

### Immutability

**Never mutate objects.** Always return new copies:

```typescript
// WRONG -- mutates original
function addTag(entity: Entity, tag: string): void {
  entity.tags.push(tag);
}

// CORRECT -- returns new object
function addTag(entity: Entity, tag: string): Entity {
  return { ...entity, tags: [...entity.tags, tag] };
}
```

All interfaces use `readonly` properties and `readonly` arrays:

```typescript
export interface StoredEntity {
  readonly id: string;
  readonly tags: readonly string[];
}
```

### File Size

- **Target:** 200-400 lines per file
- **Maximum:** 800 lines
- If a file grows past 400 lines, consider extracting utilities or splitting by responsibility.

### Error Handling

- Handle errors explicitly at every level.
- Provide user-friendly messages in CLI-facing code.
- Never silently swallow errors.
- Log detailed error context for debugging.

### Naming Conventions

- Files: `kebab-case.ts` (e.g., `metadata-extractor.ts`, `query-engine.ts`)
- Types/Interfaces: `PascalCase` (e.g., `StoredEntity`, `QueryOptions`)
- Functions: `camelCase` (e.g., `createQueryEngine`, `extractMetadata`)
- Factory functions: `create*` prefix (e.g., `createDatabaseManager`, `createValidator`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `CREATE_TABLES_SQL`, `SKIP_DIRS`)

### Zod Schemas

Zod schemas are the single source of truth for types. Define schemas first, then infer types:

```typescript
import { z } from 'zod';

export const EntityTypeSchema = z.enum(['module', 'class', 'function']);
export type EntityType = z.infer<typeof EntityTypeSchema>;
```

### Status Values

Only three valid status values: `experimental`, `stable`, `deprecated`.

Never use `active` or any other value.

## Testing Requirements

- **Minimum coverage:** 80% (statements, branches, functions, lines)
- **Framework:** Vitest
- **Coverage provider:** V8

See [testing.md](./testing.md) for detailed testing guidance.

## CI Pipeline

The CI workflow (`.github/workflows/ci.yml`) runs on every push and pull request:

```yaml
steps:
  - pnpm install --frozen-lockfile
  - pnpm turbo build
  - pnpm turbo test -- --coverage
  - pnpm turbo lint
  - pnpm turbo typecheck
```

Branch protection on `main` requires the `build-and-test` job to pass before merging.

### What CI Enforces

| Check | Requirement |
|-------|-------------|
| Build | All packages compile with `tsc` |
| Tests | All tests pass |
| Coverage | 80% minimum (statements, branches, functions, lines) |
| Lint | No ESLint errors |
| Typecheck | No TypeScript errors (`tsc --noEmit`) |

### ESLint Configuration

Defined in `eslint.config.mjs` at the workspace root:

- Based on `@eslint/js` recommended and `typescript-eslint` recommended
- Unused variables with `_` prefix are allowed (`argsIgnorePattern: '^_'`)
- `@typescript-eslint/no-explicit-any` is a warning
- Ignores `dist/`, `node_modules/`, `coverage/`, `fixtures/`

## How to Add a New CLI Command

Here is the end-to-end process for adding a new CLI command.

### 1. Create the Command File

Create `packages/cli/src/commands/my-command.ts`:

```typescript
/**
 * @knowgraph
 * type: module
 * description: CLI command that does something useful
 * owner: knowgraph-cli
 * status: experimental
 * tags: [cli, command, my-command]
 * context:
 *   business_goal: Short description of why this command exists
 *   domain: cli
 */
import { resolve } from 'node:path';
import type { Command } from 'commander';
import chalk from 'chalk';

interface MyCommandOptions {
  readonly format: string;
}

function runMyCommand(targetPath: string, options: MyCommandOptions): void {
  const absPath = resolve(targetPath);

  try {
    // Implementation here
    console.log(chalk.green('Done!'));
  } catch (err) {
    console.error(
      chalk.red(`Error: ${err instanceof Error ? err.message : String(err)}`),
    );
    process.exitCode = 1;
  }
}

export function registerMyCommand(program: Command): void {
  program
    .command('my-command [path]')
    .description('Do something useful')
    .option('--format <format>', 'Output format (text|json)', 'text')
    .action((path: string | undefined, options: MyCommandOptions) => {
      runMyCommand(path ?? '.', options);
    });
}
```

### 2. Register the Command

Add the export to `packages/cli/src/commands/index.ts`:

```typescript
export { registerMyCommand } from './my-command.js';
```

Register it in `packages/cli/src/index.ts`:

```typescript
import { registerMyCommand } from './commands/index.js';
// ...
registerMyCommand(program);
```

### 3. Write Tests

Create `packages/cli/src/__tests__/my-command.test.ts`:

```typescript
import { describe, it, expect, afterEach } from 'vitest';
// Test the underlying logic, not the CLI wiring

describe('my-command logic', () => {
  it('should do the expected thing', () => {
    // ...
  });
});
```

### 4. Build and Test

```bash
pnpm turbo build
pnpm turbo test
```

## How to Add a New Core Module

### 1. Create the Module Directory

```
packages/core/src/my-module/
  index.ts          # Public exports
  types.ts          # Interfaces and types
  my-module.ts      # Implementation
  __tests__/
    my-module.test.ts
```

### 2. Define Types

Create `packages/core/src/my-module/types.ts`:

```typescript
/**
 * @knowgraph
 * type: interface
 * description: Types for the my-module subsystem
 * owner: knowgraph-core
 * status: experimental
 * tags: [my-module, types, interface]
 */

export interface MyModuleOptions {
  readonly rootDir: string;
  readonly limit?: number;
}

export interface MyModuleResult {
  readonly items: readonly string[];
  readonly total: number;
}
```

### 3. Implement

Create `packages/core/src/my-module/my-module.ts`:

```typescript
/**
 * @knowgraph
 * type: module
 * description: Implementation of the my-module subsystem
 * owner: knowgraph-core
 * status: experimental
 * tags: [my-module, implementation]
 */
import type { MyModuleOptions, MyModuleResult } from './types.js';

export function createMyModule(): {
  readonly run: (options: MyModuleOptions) => MyModuleResult;
} {
  return {
    run(options: MyModuleOptions): MyModuleResult {
      // Implementation
      return { items: [], total: 0 };
    },
  };
}
```

### 4. Create the Barrel Export

Create `packages/core/src/my-module/index.ts`:

```typescript
export type { MyModuleOptions, MyModuleResult } from './types.js';
export { createMyModule } from './my-module.js';
```

### 5. Export from Core

Add to `packages/core/src/index.ts`:

```typescript
export * from './my-module/index.js';
```

### 6. Write Tests

Create `packages/core/src/my-module/__tests__/my-module.test.ts` and ensure 80%+ coverage.

### 7. Build and Test

```bash
pnpm turbo build && pnpm turbo test
```

## Self-Indexing

KnowGraph indexes itself. After modifying `@knowgraph` annotations in the source code:

```bash
pnpm turbo build && node packages/cli/dist/index.js index .
```

This updates the internal `.knowgraph/knowgraph.db` database.

## Pull Request Checklist

Before submitting a PR, ensure:

- [ ] All four checks pass: `build`, `test`, `lint`, `typecheck`
- [ ] Tests cover new functionality (80%+ coverage)
- [ ] New files have `@knowgraph` annotations
- [ ] Immutable patterns used (no mutations)
- [ ] Files are under 800 lines
- [ ] Commit messages follow conventional format
- [ ] No hardcoded secrets or sensitive data
- [ ] Branch is up-to-date with `main`
