# Contributing to CodeGraph

Thank you for your interest in contributing to CodeGraph! This guide covers everything you need to get started.

## Development Setup

### Prerequisites

- Node.js >= 20
- pnpm 9.x (`corepack enable && corepack prepare pnpm@9.15.4 --activate`)

### Getting Started

```bash
git clone https://github.com/example/codegraph.git
cd codegraph
pnpm install
pnpm turbo build
pnpm turbo test
```

### Project Structure

```
codegraph/
  packages/
    core/           # Parsers, indexer, query engine
      src/
        parsers/    # Language-specific parsers
        indexer/    # SQLite indexer and database
        query/      # Query engine with FTS5
        types/      # Shared TypeScript types
    cli/            # Command-line interface
    mcp-server/     # MCP server for AI integration
  schema/
    v1.0/           # JSON Schema specifications
    examples/       # Annotation examples per language
  examples/         # Full annotated example projects
```

### Common Commands

```bash
pnpm turbo build       # Build all packages
pnpm turbo test        # Run all tests
pnpm turbo typecheck   # Type check all packages
pnpm turbo lint        # Lint all packages
pnpm format            # Format code with Prettier
pnpm clean             # Clean all build artifacts
```

## Adding a New Language Parser

CodeGraph uses a plugin architecture for language parsers. To add support for a new language:

### 1. Create the parser file

Create `packages/core/src/parsers/<language>-parser.ts`:

```typescript
import type { ParseResult } from '../types/parse-result.js';
import type { Parser } from './types.js';
import { extractMetadata } from './metadata-extractor.js';

const EXTENSIONS = ['.ext'] as const;

export function createMyLanguageParser(): Parser {
  return {
    name: 'my-language',
    supportedExtensions: EXTENSIONS,

    parse(content: string, filePath: string): readonly ParseResult[] {
      // 1. Find comment blocks containing @codegraph
      // 2. Extract YAML metadata using extractMetadata()
      // 3. Determine the associated code entity (function, class, etc.)
      // 4. Return ParseResult objects
      return [];
    },
  };
}
```

### 2. Register the parser

Add it to `packages/core/src/parsers/registry.ts`:

```typescript
import { createMyLanguageParser } from './my-language-parser.js';

export function createDefaultRegistry(): ParserRegistry {
  const registry = createRegistry();
  registry.register(createPythonParser());
  registry.register(createTypescriptParser());
  registry.register(createMyLanguageParser()); // Add here
  return registry;
}
```

### 3. Export from the core package

Add the export to `packages/core/src/index.ts`:

```typescript
export { createMyLanguageParser } from './parsers/my-language-parser.js';
```

### 4. Write tests

Create `packages/core/src/parsers/__tests__/my-language-parser.test.ts` with tests covering:

- Module-level annotation extraction
- Function/method annotation extraction
- Class annotation extraction
- All metadata fields (core and extended)
- Edge cases (no annotations, malformed YAML, etc.)

### 5. Add schema examples

Create `schema/examples/<language>/` with annotated example files demonstrating the annotation format for your language.

## Adding a New MCP Tool

MCP tools let AI assistants query the CodeGraph index. To add a new tool:

### 1. Create the tool file

Create `packages/mcp-server/src/tools/<tool-name>.ts`:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpDatabase } from '../db.js';

export function registerMyTool(server: McpServer, db: McpDatabase): void {
  server.tool(
    'my_tool_name',
    'Description of what the tool does',
    {
      // Zod schema for parameters
      param: z.string().describe('Parameter description'),
    },
    async (params) => {
      // Query the database and return results
      return {
        content: [{ type: 'text' as const, text: 'Result' }],
      };
    }
  );
}
```

### 2. Register the tool

Add it to `packages/mcp-server/src/tools/index.ts`:

```typescript
import { registerMyTool } from './my-tool.js';

export function registerAllTools(server: McpServer, db: McpDatabase): void {
  // ... existing tools
  registerMyTool(server, db);
}
```

## Coding Style

- **Immutability**: Always create new objects instead of mutating existing ones. Use `readonly` on all interface properties and function parameters.
- **Small files**: Keep files under 400 lines. Extract utilities when files grow large.
- **Small functions**: Keep functions under 50 lines.
- **Error handling**: Handle errors explicitly at every level. Never silently swallow errors.
- **TypeScript strict mode**: All packages use strict TypeScript. No `any` types without justification.
- **Functional style**: Prefer pure functions and immutable data structures.

## Testing Requirements

- **Minimum 80% coverage** for all new code
- **TDD workflow**: Write tests first, then implement
- **Test types**:
  - Unit tests for individual functions and parsers
  - Integration tests for the indexer and query engine
  - Test all edge cases (empty input, malformed data, missing fields)
- **Test framework**: Vitest

Run tests:

```bash
pnpm turbo test                    # All tests
cd packages/core && pnpm test      # Core package tests only
```

## Pull Request Process

1. **Fork and branch**: Create a feature branch from `main`
2. **Implement**: Follow TDD workflow (red-green-refactor)
3. **Test**: Ensure all tests pass and coverage meets 80%
4. **Type check**: Run `pnpm turbo typecheck`
5. **Lint**: Run `pnpm turbo lint`
6. **Commit**: Use conventional commit messages (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)
7. **PR**: Open a pull request with a clear description of changes

### Commit Message Format

```
<type>: <description>

<optional body explaining why>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

## Reporting Issues

Open an issue on GitHub with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- CodeGraph version and Node.js version
