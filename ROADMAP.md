# KnowGraph Roadmap

> Machine-readable tracker: [`roadmap/tracker.yml`](roadmap/tracker.yml)
> Decision log: [`roadmap/decisions.yml`](roadmap/decisions.yml)
> Project documentation: [`docs/`](docs/)

---

## Phase 0: Foundation `COMPLETE`

Schema specification, monorepo setup, build tooling, testing framework.

- [x] JSON Schema v1.0 (core, extended, manifest)
- [x] Zod validation schemas with TypeScript type inference
- [x] Monorepo with pnpm workspaces + Turborepo
- [x] TypeScript strict mode, ESLint, Vitest
- [x] GitHub Actions CI pipeline
- [x] README.md and CONTRIBUTING.md
- [x] Schema examples (Python, TypeScript, Go, Java)

---

## Phase 1: Core Parsing Engine `COMPLETE`

Multi-language parsers for extracting @knowgraph metadata from code.

- [x] Python parser (docstrings with @knowgraph blocks)
- [x] TypeScript/JavaScript parser (JSDoc with @knowgraph tags)
- [x] Generic fallback parser (regex-based for any language)
- [x] Metadata extractor with YAML parsing and Zod validation
- [x] Parser registry with extension-based routing
- [x] CLI: `knowgraph parse` command
- [x] Go parser (entity-level: functions, structs, methods, interfaces)
- [x] Java parser (entity-level: classes, methods, interfaces, enums)
- [ ] Tree-sitter integration for robust AST-based parsing

---

## Phase 2: Graph Builder & Indexer `COMPLETE`

SQLite-based knowledge graph with full-text search.

- [x] SQLite schema with FTS5 full-text search
- [x] Entity storage with CRUD operations
- [x] Relationship graph (dependencies, dependents)
- [x] Tag and link storage
- [x] Incremental indexing via MD5 file hashing
- [x] .gitignore-aware file scanning
- [x] Progress reporting
- [x] CLI: `knowgraph index` command
- [ ] Vector embeddings for semantic search
- [ ] Monorepo support (multiple .knowgraph.yml files)
- [ ] External link URL validation

---

## Phase 3: Query Interface & MCP Server `COMPLETE`

AI-queryable interfaces for the code knowledge graph.

- [x] Query engine with FTS5 search, filters, pagination
- [x] Dependency traversal (find all deps of entity X)
- [x] MCP server with 7 tools (search, owner, business goal, deps, details, links, overview)
- [x] stdio transport for Claude Desktop / Claude Code
- [x] CLI: `knowgraph serve` command
- [x] CLI: `knowgraph query` command
- [x] Claude Desktop MCP config generator
- [ ] Semantic search tool (vector similarity)
- [ ] Auto-reload on index changes
- [ ] MCP resources (entity details on demand)

---

## Phase 4: External Knowledge Connectors `NOT STARTED`

Enrich the graph with metadata from external tools.

- [ ] Connector plugin architecture
- [ ] Notion connector (page metadata, summaries)
- [ ] Jira connector (ticket metadata, status, acceptance criteria)
- [ ] Linear connector (GraphQL issue metadata)
- [ ] Generic webhook connector (configurable HTTP)
- [ ] Connector authentication and token management
- [ ] Rate limiting and caching layer
- [ ] Broken link detection and reporting
- [ ] CLI: `knowgraph sync` command

---

## Phase 5: Developer Experience `MOSTLY COMPLETE`

Make adoption frictionless for teams.

- [x] `knowgraph init` wizard with language detection
- [x] Auto-detect project languages from file extensions
- [x] Suggest high-impact files to annotate
- [x] Self-documentation (KnowGraph indexes itself)
- [x] Documentation coverage reporting (% of code annotated) (PR #12)
- [x] Coverage breakdown by module, team, type (PR #12)
- [x] Pre-commit hook for annotation validation (PR #10)
- [x] CI quality gate (knowgraph-gate.yml workflow)
- [x] CLI: `knowgraph suggest` (where to annotate next) (PR #13)
- [x] CLI: `knowgraph validate` (check all annotations) (PR #11)
- [x] CLI: `knowgraph coverage` (documentation coverage) (PR #12)
- [x] CLI: `knowgraph hook` (install pre-commit hook) (PR #10)
- [ ] HTML coverage report generation
- [ ] Migration assistant (suggest annotations via LLM)
- [ ] CLI: `knowgraph migrate` (LLM-assisted migration)

---

## Phase 6: Alternative AI Interfaces `IN PROGRESS`

Support non-MCP AI tools and custom integrations.

- [x] Cursor Rules generator (.cursorrules export)
- [x] Generic AI skills export (markdown context files)
- [x] CLI: `knowgraph export` (--format cursorrules|markdown)
- [ ] REST API server (Express.js + OpenAPI spec)
- [ ] GraphQL API server (Apollo/Yoga)
- [ ] API authentication (API keys)
- [ ] Rate limiting

---

## Phase 7: Documentation & Community `IN PROGRESS`

Prepare for public launch.

- [x] README.md with quickstart
- [x] CONTRIBUTING.md
- [x] Example projects (Python FastAPI, TypeScript Express)
- [x] Schema examples (Python, TypeScript, Go, Java)
- [x] Project architecture documentation ([docs/](docs/))
- [x] Core package implementation docs ([docs/core/](docs/core/))
- [x] CLI package implementation docs ([docs/cli/](docs/cli/))
- [x] MCP server implementation docs ([docs/mcp-server/](docs/mcp-server/))
- [x] Annotation guide and schema reference ([docs/annotations/](docs/annotations/))
- [x] SECURITY.md
- [x] CODE_OF_CONDUCT.md (Contributor Covenant)
- [x] CHANGELOG.md
- [x] CODEOWNERS
- [x] Issue templates (bug report, feature request)
- [x] Pull request template
- [ ] Getting Started tutorial (step-by-step walkthrough)
- [ ] VSCode extension (syntax highlighting, autocomplete)
- [ ] JetBrains plugin (basic support)
- [x] GitHub Action for automated indexing
- [ ] Demo video

---

## Phase 8: Launch & Growth `IN PROGRESS`

Public release and community building.

- [x] npm package publishing (`npm install -g @knowgraph/cli`)
- [x] Release workflow (GitHub Actions → npm with provenance)
- [x] Version 0.2.0 released
- [x] Issue templates and triage process
- [ ] GitHub release with binaries
- [ ] Product Hunt launch
- [ ] Hacker News Show HN
- [ ] Dev.to article
- [ ] Discord community server
- [ ] GitHub Discussions
- [ ] Feature voting system
- [ ] Weekly office hours
- [ ] Additional language parsers (Rust, C++, Ruby, Kotlin, Swift)
- [ ] SaaS hosted version (optional)
