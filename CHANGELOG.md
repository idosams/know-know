# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2026-03-08

### Fixed

- Python parser now correctly handles multi-line class definitions (e.g., classes with base classes spanning multiple lines)
- Python parser now correctly handles multi-line function/method definitions (e.g., functions with many parameters)

## [0.4.0] - 2026-03-07

### Added

- Connector plugin architecture with registry, validation, and sync orchestration
- Notion connector — fetches page metadata (title, status, last edited) via Notion API v1
- Jira connector — fetches issue metadata (summary, status, assignee, priority) via Jira REST API v3
- In-memory TTL cache for connector API responses
- Token bucket rate limiter to prevent API rate limit violations
- CLI: `knowgraph sync [connectors...]` command with `--dry-run`, `--owner`, `--tags`, `--verbose` flags
- `ConnectorConfigSchema` extended with `base_url`, `project`, and `sync_interval` fields

## [0.3.0] - 2026-02-19

### Added

- Go parser (functions, methods, structs, interfaces, const/var groups, packages)
- Java parser (classes, interfaces, enums, records, methods, packages)
- Export command (`knowgraph export --format cursorrules|markdown`)
- GitHub Action for CI integration (`action.yml`)
- CI quality gate workflow (`knowgraph-gate.yml`)
- Version bump script (`scripts/bump-version.sh`)
- Tag-based release workflow with pre-release support (`beta`, `rc` dist-tags)

### Changed

- Release workflow now triggers on tag push (`v*`) instead of GitHub Release events
- Release workflow auto-creates GitHub Releases with pre-release detection

## [0.2.0] - 2026-02-16

### Added

- npm package publishing configuration for all packages (`files`, `exports`, `publishConfig`)
- `"type": "module"` to `@know-graph/core` and `@know-graph/mcp-server`
- `knowgraph-mcp` binary for standalone MCP server usage
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

- **Core library** (`@know-graph/core`)
  - Python parser for docstring-based `@knowgraph` annotations
  - TypeScript/JavaScript parser for JSDoc-based annotations
  - Go parser for line-comment-based `knowgraph:` annotations
  - Generic parser for any language using comment blocks
  - Metadata extractor with Zod schema validation
  - SQLite indexer with FTS5 full-text search
  - Query engine with filtering by owner, tags, type, and status
  - Parser registry with plugin architecture

- **CLI** (`@know-graph/cli`)
  - `knowgraph init` — initialize KnowGraph in a project
  - `knowgraph parse <path>` — parse and output entities as JSON
  - `knowgraph index <path>` — parse and index into SQLite
  - `knowgraph query <text>` — full-text search with filters
  - `knowgraph serve` — start the MCP server

- **MCP Server** (`@know-graph/mcp-server`)
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

[0.4.1]: https://github.com/idosams/know-know/releases/tag/v0.4.1
[0.4.0]: https://github.com/idosams/know-know/releases/tag/v0.4.0
[0.3.0]: https://github.com/idosams/know-know/releases/tag/v0.3.0
[0.2.0]: https://github.com/idosams/know-know/releases/tag/v0.2.0
[0.1.0]: https://github.com/idosams/know-know/releases/tag/v0.1.0
