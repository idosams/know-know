# KnowGraph — Project Rules

## Git Workflow

NEVER push directly to `main`. All changes go through pull requests.

1. Create a feature branch: `git checkout -b <type>/<description> main`
2. Commit on the feature branch
3. Push with `-u`: `git push -u origin <branch-name>`
4. Create PR: `gh pr create`

Branch types: `feat/`, `fix/`, `refactor/`, `docs/`, `test/`, `chore/`, `perf/`, `ci/`

## Monorepo Structure

```
packages/
  core/       — @knowgraph/core (parsers, indexer, query engine, types)
  cli/        — @knowgraph/cli (Commander.js CLI)
  mcp-server/ — @knowgraph/mcp-server (MCP protocol server)
```

## Build & Test

```bash
pnpm install              # install dependencies
pnpm turbo build          # build all packages
pnpm turbo test           # run all tests (vitest)
pnpm turbo lint           # eslint
pnpm turbo typecheck      # tsc --noEmit
```

All four checks must pass before creating a PR.

## CI Requirements

PRs cannot be merged until the `build-and-test` CI job passes. The CI enforces:

- **Build** — all packages must compile
- **Tests** — all tests must pass
- **Coverage** — 80% minimum (statements, branches, functions, lines)
- **Lint** — no ESLint errors
- **Typecheck** — no TypeScript errors

Branch protection is enabled on `main` — the CI status check is required.

## Self-Indexing

KnowGraph indexes itself. After modifying @knowgraph annotations:

```bash
pnpm turbo build && node packages/cli/dist/index.js index .
```

## Key Conventions

- **Immutable patterns** — never mutate objects, return new copies
- **Zod schemas** — single source of truth for types (see `packages/core/src/types/`)
- **Status values** — only `experimental`, `stable`, or `deprecated` (NOT `active`)
- **@knowgraph annotations** — JSDoc blocks with `@knowgraph` YAML marker before imports
- **File size** — 200-400 lines typical, 800 max
- **Test coverage** — 80%+ required (enforced by CI)

## Documentation

Comprehensive project documentation lives in `docs/`:

- **[docs/README.md](docs/README.md)** — Complete project overview with diagrams
- **[docs/architecture.md](docs/architecture.md)** — System architecture deep-dive
- **[docs/design-decisions.md](docs/design-decisions.md)** — ADR-style decision records

### Core Package

- **[docs/core/types.md](docs/core/types.md)** — Zod schemas and type system
- **[docs/core/parsers.md](docs/core/parsers.md)** — Parser registry and language parsers
- **[docs/core/indexer.md](docs/core/indexer.md)** — SQLite indexer and incremental indexing
- **[docs/core/query-engine.md](docs/core/query-engine.md)** — FTS5 query engine
- **[docs/core/validation.md](docs/core/validation.md)** — Annotation validation rules
- **[docs/core/coverage.md](docs/core/coverage.md)** — Documentation coverage calculator
- **[docs/core/suggest.md](docs/core/suggest.md)** — File suggestion engine

### CLI & MCP Server

- **[docs/cli/getting-started.md](docs/cli/getting-started.md)** — Quick start guide
- **[docs/cli/commands.md](docs/cli/commands.md)** — Complete CLI command reference
- **[docs/mcp-server/overview.md](docs/mcp-server/overview.md)** — MCP server architecture
- **[docs/mcp-server/tools.md](docs/mcp-server/tools.md)** — MCP tools reference

### Development

- **[docs/development/contributing.md](docs/development/contributing.md)** — Contributing guide
- **[docs/development/testing.md](docs/development/testing.md)** — Testing guide (Vitest)
- **[docs/development/api-reference.md](docs/development/api-reference.md)** — Core API reference
- **[docs/annotations/README.md](docs/annotations/README.md)** — Full annotation guide & schema reference

## Roadmap

Machine-readable tracker: `roadmap/tracker.yml`
Decision log: `roadmap/decisions.yml`
Human-readable: `ROADMAP.md`
