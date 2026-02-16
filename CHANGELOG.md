# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-16

### Added

- npm package publishing configuration for all packages (`files`, `exports`, `publishConfig`)
- `"type": "module"` to `@codegraph/core` and `@codegraph/mcp-server`
- `codegraph-mcp` binary for standalone MCP server usage
- MIT LICENSE file
- README badges (CI, npm version, license) and table of contents
- Contributing section in README linking to CONTRIBUTING.md
- SECURITY.md with responsible disclosure policy
- CODE_OF_CONDUCT.md (Contributor Covenant v2.1)
- CODEOWNERS file
- GitHub issue templates (bug report, feature request) and PR template
- Example project READMEs for python-fastapi and typescript-express
- GitHub Actions release workflow for npm publishing with provenance

### Fixed

- Clone URL in README and CONTRIBUTING.md now points to correct repository

## [0.1.0] - 2026-02-16

### Added

- **Core library** (`@codegraph/core`)
  - Python parser for docstring-based `@codegraph` annotations
  - TypeScript/JavaScript parser for JSDoc-based annotations
  - Go parser for line-comment-based `codegraph:` annotations
  - Generic parser for any language using comment blocks
  - Metadata extractor with Zod schema validation
  - SQLite indexer with FTS5 full-text search
  - Query engine with filtering by owner, tags, type, and status
  - Parser registry with plugin architecture

- **CLI** (`@codegraph/cli`)
  - `codegraph init` — initialize CodeGraph in a project
  - `codegraph parse <path>` — parse and output entities as JSON
  - `codegraph index <path>` — parse and index into SQLite
  - `codegraph query <text>` — full-text search with filters
  - `codegraph serve` — start the MCP server

- **MCP Server** (`@codegraph/mcp-server`)
  - `search_code` — full-text search across entities
  - `find_by_owner` — find entities by team or person
  - `find_by_business_goal` — discover entities by business objective
  - `get_dependencies` — map entity dependencies
  - `get_entity_details` — get complete metadata for an entity
  - `get_external_knowledge` — find linked external resources
  - `graph_overview` — high-level codebase statistics

- **Annotation schema** supporting core fields (type, description, owner, status, tags, links) and extended fields (business context, compliance, dependencies, operational metadata)

- **Example projects**
  - Python FastAPI e-commerce API with 30+ annotated entities
  - TypeScript Express blog platform with 30+ annotated entities

[0.2.0]: https://github.com/idosams/know-know/releases/tag/v0.2.0
[0.1.0]: https://github.com/idosams/know-know/releases/tag/v0.1.0
