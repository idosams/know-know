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
- **Test coverage** — 80%+ required

## Roadmap

Machine-readable tracker: `roadmap/tracker.yml`
Decision log: `roadmap/decisions.yml`
Human-readable: `ROADMAP.md`
