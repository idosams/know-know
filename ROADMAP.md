# CodeGraph Roadmap

> Machine-readable tracker: [`roadmap/tracker.yml`](roadmap/tracker.yml)
> Decision log: [`roadmap/decisions.yml`](roadmap/decisions.yml)

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

Multi-language parsers for extracting @codegraph metadata from code.

- [x] Python parser (docstrings with @codegraph blocks)
- [x] TypeScript/JavaScript parser (JSDoc with @codegraph tags)
- [x] Generic fallback parser (regex-based for any language)
- [x] Metadata extractor with YAML parsing and Zod validation
- [x] Parser registry with extension-based routing
- [x] CLI: `codegraph parse` command
- [ ] Go parser (comments with codegraph: prefix)
- [ ] Java parser (JavaDoc with @codegraph tags)
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
- [x] CLI: `codegraph index` command
- [ ] Vector embeddings for semantic search
- [ ] Monorepo support (multiple .codegraph.yml files)
- [ ] External link URL validation

---

## Phase 3: Query Interface & MCP Server `COMPLETE`

AI-queryable interfaces for the code knowledge graph.

- [x] Query engine with FTS5 search, filters, pagination
- [x] Dependency traversal (find all deps of entity X)
- [x] MCP server with 7 tools (search, owner, business goal, deps, details, links, overview)
- [x] stdio transport for Claude Desktop / Claude Code
- [x] CLI: `codegraph serve` command
- [x] CLI: `codegraph query` command
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
- [ ] CLI: `codegraph sync` command

---

## Phase 5: Developer Experience `IN PROGRESS`

Make adoption frictionless for teams.

- [x] `codegraph init` wizard with language detection
- [x] Auto-detect project languages from file extensions
- [x] Suggest high-impact files to annotate
- [x] Self-documentation (CodeGraph indexes itself)
- [ ] Documentation coverage reporting (% of code annotated)
- [ ] Coverage breakdown by module, team, type
- [ ] HTML coverage report generation
- [ ] Pre-commit hook for annotation validation
- [ ] CI quality gate (fail if coverage drops)
- [ ] Migration assistant (suggest annotations via LLM)
- [ ] CLI: `codegraph suggest` (where to annotate next)
- [ ] CLI: `codegraph validate` (check all annotations)
- [ ] CLI: `codegraph coverage` (documentation coverage)
- [ ] CLI: `codegraph migrate` (LLM-assisted migration)

---

## Phase 6: Alternative AI Interfaces `NOT STARTED`

Support non-MCP AI tools and custom integrations.

- [ ] Cursor Rules generator (.cursorrules export)
- [ ] Generic AI skills export (markdown context files)
- [ ] REST API server (Express.js + OpenAPI spec)
- [ ] GraphQL API server (Apollo/Yoga)
- [ ] API authentication (API keys)
- [ ] Rate limiting
- [ ] CLI: `codegraph export` (cursor, skills, openapi, graphql)

---

## Phase 7: Documentation & Community `IN PROGRESS`

Prepare for public launch.

- [x] README.md with quickstart
- [x] CONTRIBUTING.md
- [x] Example projects (Python FastAPI, TypeScript Express)
- [x] Schema examples (Python, TypeScript, Go, Java)
- [ ] Getting Started guide
- [ ] Schema reference documentation
- [ ] Parser development guide (add new languages)
- [ ] Connector development guide (add new sources)
- [ ] API reference (MCP tools, REST, GraphQL)
- [ ] Best practices guide
- [ ] VSCode extension (syntax highlighting, autocomplete)
- [ ] JetBrains plugin (basic support)
- [ ] GitHub Action for automated indexing
- [ ] Demo video

---

## Phase 8: Launch & Growth `NOT STARTED`

Public release and community building.

- [ ] npm package publishing (`npm install -g codegraph`)
- [ ] GitHub release with binaries
- [ ] Product Hunt launch
- [ ] Hacker News Show HN
- [ ] Dev.to article
- [ ] Discord community server
- [ ] GitHub Discussions
- [ ] Issue templates and triage process
- [ ] Feature voting system
- [ ] Weekly office hours
- [ ] Additional language parsers (Rust, C++, Ruby, Kotlin, Swift)
- [ ] SaaS hosted version (optional)
