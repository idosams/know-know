# KnowGraph Project Initialization Prompt

You are tasked with planning and architecting **KnowGraph**, an open-source documentation orchestration tool that makes codebases AI-navigable by bridging code documentation with business context and external knowledge sources.

## Project Vision

**What it solves**: Current code documentation tools (MkDocs, Sphinx) generate reference docs for humans but lack business context. AI coding assistants (Claude Code, Cursor, GitHub Copilot) can read code but cannot understand why code exists, what business goals it serves, or how it connects to external knowledge (Notion, Jira, etc.).

**What we're building**: A lightweight metadata-enriched documentation system that:
1. Extracts structured metadata from code annotations
2. Builds a queryable knowledge graph connecting code ↔ business context ↔ external knowledge
3. Exposes AI-friendly interfaces (MCP servers, skills, APIs) for navigation
4. Requires minimal developer overhead through progressive disclosure and smart defaults

**Success criteria**:
- Developers can annotate code in 2-3 minutes per function
- AI agents can answer "what does this code do AND why does it exist?"
- Zero friction adoption: works with existing codebases without restructuring
- Language-agnostic: Python, TypeScript, Go, Java, etc.

## Core Architecture (Three Layers)

### Layer 1: Metadata Protocol
A minimal, language-agnostic schema embedded in code comments/docstrings:

**Required fields** (minimal viable annotation):
- `type`: entity type (module, class, function, service, api_endpoint)
- `description`: human-readable description

**Recommended fields** (core business context):
- `owner`: team or person responsible
- `status`: experimental | stable | deprecated
- `tags`: array of searchable tags
- `links`: external references (Notion, Jira, Confluence, Linear)

**Extended fields** (rich business/operational context):
- `context`: business_goal, funnel_stage, revenue_impact
- `dependencies`: services, external_apis, databases
- `compliance`: regulations (GDPR, PCI-DSS), data_sensitivity, audit_requirements
- `operational`: sla, on_call_team, monitoring_dashboards

### Layer 2: Multi-Language Parsers
Support for major languages through tree-sitter with fallback regex:
- Python (docstrings with @knowgraph blocks)
- TypeScript/JavaScript (JSDoc with @knowgraph tags)
- Go (comments with knowgraph: prefix)
- Java (JavaDoc with @knowgraph tags)
- Rust, C++, Ruby, etc. (progressively add)

### Layer 3: Knowledge Graph Index
Build a queryable graph with multiple indexes:
- **Entity graph**: all code entities with metadata
- **Relationship graph**: function calls, dependencies, ownership
- **External knowledge graph**: links to Notion, Jira, etc.
- **Business index**: by goal, funnel stage, revenue impact
- **Compliance index**: by regulation, data sensitivity
- **Vector embeddings**: for semantic code search

### Layer 4: AI Agent Interfaces
Multiple consumption interfaces for different AI tools:
- **MCP Server**: for Claude Desktop, Claude Code (primary target)
- **Cursor Rules**: for Cursor IDE
- **Skills/Context files**: for generic AI assistants
- **REST API**: for custom integrations
- **GraphQL API**: for complex queries

## Technical Stack Specifications

### Core Implementation
- **Language**: TypeScript (Node.js ecosystem, broad compatibility)
- **Parser**: tree-sitter (40+ languages, battle-tested)
- **CLI Framework**: Commander.js or oclif
- **Schema Validation**: Zod or JSON Schema
- **File System**: Node fs/promises

### Storage & Indexing
- **Primary storage**: SQLite with FTS5 (full-text search)
- **Vector database**: ChromaDB, LanceDB, or pgvector
- **Cache layer**: In-memory LRU cache for hot paths
- **Export formats**: JSON, YAML, MessagePack

### External Integrations
- **Notion API**: @notionhq/client
- **Jira REST API**: jira-client
- **Linear GraphQL**: @linear/sdk
- **Generic webhook connector**: axios with retry logic

### AI Interfaces
- **MCP SDK**: @modelcontextprotocol/sdk
- **OpenAPI spec generation**: for REST API
- **GraphQL server**: Apollo Server or Yoga

### Development Tools
- **Testing**: Vitest
- **Linting**: ESLint + Prettier
- **Type checking**: TypeScript strict mode
- **Git hooks**: Husky + lint-staged
- **CI/CD**: GitHub Actions

## Complete Project Roadmap

### Phase 0: Foundation (Week 1-2)
**Goal**: Define the standard and validate the concept

**Deliverables**:
1. **Schema Specification v1.0**
   - Core schema JSON Schema definition
   - Extended schema JSON Schema
   - Repository manifest (.knowgraph.yml) format
   - Create 10+ examples across Python, TypeScript, Go, Java
   - Document migration path from unstructured → basic → rich

2. **Design Documents**
   - Index structure specification
   - Query interface design
   - MCP tool definitions
   - External connector plugin architecture

3. **Repository Setup**
   - Initialize monorepo with proper structure
   - Setup TypeScript + build tooling
   - Configure testing framework
   - Create GitHub Actions workflows
   - Write comprehensive README and CONTRIBUTING.md

**Validation**: Get 3-5 developers to manually annotate sample codebases and provide feedback

### Phase 1: Core Parsing Engine (Week 3-4)
**Goal**: Extract metadata from annotated code files

**Deliverables**:
1. **Tree-sitter Parsers**
   - Python parser (docstring extraction + @knowgraph blocks)
   - TypeScript parser (JSDoc extraction + @knowgraph tags)
   - Go parser (comment extraction + knowgraph: prefix)
   - Generic fallback parser (regex-based for unsupported languages)

2. **Metadata Extractor**
   - Parse and validate @knowgraph blocks
   - Extract standard docstring/JSDoc content
   - Validate against JSON Schema
   - Report syntax errors with line numbers
   - Handle partial/incomplete metadata gracefully

3. **CLI: `knowgraph parse`**
   - Input: file path or directory
   - Output: JSON array of entities with metadata
   - Flags: --validate, --format (json|yaml), --language (auto-detect)

**Tests**: Parse 100+ real-world files from open-source repos

### Phase 2: Graph Builder & Indexer (Week 5-6)
**Goal**: Build queryable knowledge graph from parsed entities

**Deliverables**:
1. **Graph Construction**
   - Entity graph builder (nodes = code entities)
   - Relationship analyzer (calls, imports, dependencies)
   - Ownership mapper (team → entities)
   - External link resolver (validate URLs, fetch metadata)

2. **Multi-Index Builder**
   - SQLite database schema
   - FTS5 full-text search index
   - Business context indexes (goal, funnel, impact)
   - Compliance indexes (regulation, sensitivity)
   - Generate embeddings for semantic search

3. **Repository Scanner**
   - Respect .gitignore and custom exclude patterns
   - Incremental indexing (only reprocess changed files)
   - Progress reporting for large repos
   - Handle monorepos (multiple .knowgraph.yml files)

4. **CLI: `knowgraph index`**
   - Input: repository root
   - Output: .knowgraph/ directory with SQLite + embeddings
   - Flags: --exclude, --incremental, --verbose

**Tests**: Index large repos (100K+ LOC) in <30 seconds

### Phase 3: Query Interface & MCP Server (Week 7-8)
**Goal**: Make the graph queryable by AI agents

**Deliverables**:
1. **Query Engine**
   - Text search (by name, description, tags)
   - Structured queries (by owner, status, type)
   - Business context queries (by goal, funnel, impact)
   - Dependency traversal (find all dependencies of X)
   - External knowledge lookup (find Notion pages for code)
   - Semantic search (find similar code)

2. **MCP Server Implementation**
   - Tool: `find_code_by_description` (text search)
   - Tool: `find_code_by_owner` (team/person)
   - Tool: `find_code_by_business_goal` (business context)
   - Tool: `get_code_dependencies` (full dependency tree)
   - Tool: `get_external_knowledge` (Notion/Jira links)
   - Tool: `search_code_semantically` (vector similarity)
   - Resource: Code entity details on demand

3. **CLI: `knowgraph serve`**
   - Start MCP server (stdio transport)
   - Auto-reload on index changes
   - Logging and debugging support

4. **Claude Code Integration**
   - MCP configuration for Claude Desktop
   - Installation guide
   - Example queries and use cases

**Tests**: Integration test with actual Claude Code queries

### Phase 4: External Knowledge Connectors (Week 9-10)
**Goal**: Enrich graph with external context

**Deliverables**:
1. **Notion Connector**
   - Fetch page metadata (title, last updated, summary)
   - Cache to avoid rate limits
   - Validate workspace access
   - Handle authentication

2. **Jira Connector**
   - Fetch ticket metadata (title, status, description)
   - Extract acceptance criteria
   - Cache results
   - Handle authentication

3. **Linear Connector**
   - GraphQL integration
   - Fetch issue metadata
   - Cache results

4. **Generic Webhook Connector**
   - Configurable HTTP requests
   - Template-based payload
   - Custom header support
   - For internal wikis, custom tools

5. **CLI: `knowgraph sync`**
   - Refresh external knowledge cache
   - Report broken links
   - Flag: --connector (notion|jira|linear|all)

**Tests**: Mock external APIs, validate error handling

### Phase 5: Developer Experience (Week 11-12)
**Goal**: Make adoption frictionless

**Deliverables**:
1. **Smart Initialization**
   - `knowgraph init` wizard
   - Auto-detect language, framework, structure
   - Generate .knowgraph.yml with intelligent defaults
   - Suggest high-impact files to annotate first

2. **Coverage Reporting**
   - Documentation coverage percentage
   - Breakdown by module, team, type
   - Identify gaps (frequently-called functions without metadata)
   - Generate HTML report

3. **Validation & Quality Gates**
   - Pre-commit hook (validates new/changed annotations)
   - CI check (fails if coverage drops)
   - VSCode extension (inline validation, autocomplete)

4. **Migration Assistant**
   - Analyze existing docs (README, wiki, comments)
   - Suggest @knowgraph annotations using LLM
   - Generate draft annotations for review

5. **CLI Enhancements**
   - `knowgraph suggest`: where to annotate next
   - `knowgraph validate`: check all annotations
   - `knowgraph coverage`: report documentation coverage
   - `knowgraph migrate`: assist migration

**Tests**: Onboard 5 real repos, measure time-to-first-index

### Phase 6: Alternative AI Interfaces (Week 13-14)
**Goal**: Support non-MCP AI tools

**Deliverables**:
1. **Cursor Rules Generator**
   - Export graph as .cursorrules
   - Include search functions
   - Format for Cursor's context system

2. **Skills Export**
   - Generic markdown skill files
   - Compatible with any AI assistant
   - Include example queries

3. **REST API**
   - Express.js server
   - OpenAPI spec
   - Authentication (API keys)
   - Rate limiting

4. **GraphQL API**
   - Apollo Server
   - Schema matches graph structure
   - Efficient nested queries

5. **CLI: `knowgraph export`**
   - Flags: --format (cursor|skills|openapi|graphql)
   - Output: formatted files for each interface

### Phase 7: Documentation & Community (Week 15-16)
**Goal**: Prepare for public launch

**Deliverables**:
1. **Comprehensive Documentation**
   - Getting Started guide
   - Schema reference (all fields explained)
   - Parser implementation guide (add new languages)
   - Connector development guide (add new external sources)
   - API reference (MCP, REST, GraphQL)
   - Best practices guide

2. **Example Projects**
   - 5+ annotated sample repos (Python, TS, Go, Java, Rust)
   - Demo video (5 minutes)
   - Interactive tutorial
   - Before/after comparisons

3. **Developer Tooling**
   - VSCode extension (syntax highlighting, autocomplete, validation)
   - JetBrains plugin (basic support)
   - GitHub Action (automated indexing in CI)

4. **Community Infrastructure**
   - Discord server
   - GitHub Discussions
   - Issue templates
   - Contributing guide
   - Code of conduct

### Phase 8: Launch & Iteration (Week 17+)
**Goal**: Public release and community feedback

**Deliverables**:
1. **Public Release**
   - npm package: `npm install -g knowgraph`
   - GitHub release with binaries
   - Product Hunt launch
   - Hacker News Show HN post
   - Dev.to article
   - Twitter/X announcement

2. **Feedback Integration**
   - Weekly office hours
   - Monthly roadmap updates
   - Issue triage process
   - Feature voting system

3. **Growth Features** (based on feedback)
   - Additional language support
   - More external connectors
   - Advanced query features
   - Team collaboration features
   - SaaS hosted version (optional)

## Repository Structure

```
knowgraph/
├── packages/
│   ├── core/              # Core library (parsers, indexer, graph)
│   ├── cli/               # Command-line interface
│   ├── mcp-server/        # MCP server implementation
│   ├── rest-api/          # REST API server
│   ├── graphql-api/       # GraphQL API server
│   ├── connectors/        # External knowledge connectors
│   │   ├── notion/
│   │   ├── jira/
│   │   ├── linear/
│   │   └── webhook/
│   └── vscode-extension/  # VSCode integration
│
├── schema/
│   ├── v1.0/
│   │   ├── core.schema.json
│   │   ├── extended.schema.json
│   │   └── manifest.schema.json
│   └── examples/
│       ├── python/
│       ├── typescript/
│       ├── go/
│       └── java/
│
├── docs/
│   ├── getting-started.md
│   ├── schema-reference.md
│   ├── parser-development.md
│   ├── connector-development.md
│   ├── api-reference.md
│   └── best-practices.md
│
├── examples/
│   ├── python-fastapi/    # Annotated FastAPI project
│   ├── typescript-express/# Annotated Express project
│   ├── go-gin/           # Annotated Gin project
│   └── java-spring/      # Annotated Spring project
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── release.yml
│   │   └── publish.yml
│   └── ISSUE_TEMPLATE/
│
├── README.md
├── CONTRIBUTING.md
├── LICENSE (MIT)
└── package.json
```

## Key Technical Decisions to Make

### Decision 1: Monorepo vs Multi-repo
**Recommendation**: Monorepo (using pnpm workspaces or Turborepo)
- Shared types across packages
- Atomic changes across CLI + core + MCP server
- Simplified dependency management

### Decision 2: Embedding Model
**Options**:
- OpenAI text-embedding-3-small (requires API key)
- Sentence Transformers (local, no API)
- Cohere Embed (multilingual)

**Recommendation**: Start with Sentence Transformers (no API dependency), add OpenAI as optional enhancement

### Decision 3: Vector Database
**Options**:
- ChromaDB (popular, Python-first but has JS client)
- LanceDB (Rust-based, excellent performance)
- pgvector (if already using PostgreSQL)

**Recommendation**: LanceDB (better Node.js support, great performance)

### Decision 4: MCP vs REST-first
**Recommendation**: MCP-first (highest value for target users), REST as secondary interface

### Decision 5: Versioning Strategy
**Recommendation**: Semantic versioning with schema version decoupled from package version
- Schema: v1.0, v1.1, v2.0 (breaking changes)
- Package: 0.1.0, 0.2.0, 1.0.0 (semver)

## Success Metrics (3 months post-launch)

**Adoption**:
- 1,000+ npm downloads/week
- 100+ GitHub stars
- 20+ community contributors
- 5+ community-built connectors/parsers

**Quality**:
- <5% parse failure rate on real-world code
- <10s indexing time for 50K LOC repo
- >95% uptime for MCP server
- <100ms query response time

**Community**:
- 50+ Discord members
- 10+ GitHub discussions per week
- 5+ blog posts/articles mentioning project

## Your Task: Create the Complete Plan

Based on this prompt, you should:

1. **Validate the architecture**: Identify any technical gaps or risks
2. **Design the schema**: Create the complete v1.0 JSON Schema specification
3. **Plan the implementation**: Break down each phase into specific tasks
4. **Setup the repository**: Initialize with proper TypeScript, testing, and CI/CD
5. **Create decision logs**: Document key technical decisions (ADRs)
6. **Identify dependencies**: What libraries, APIs, and tools are needed
7. **Risk analysis**: What could go wrong and how to mitigate

## Constraints & Considerations

- **Zero-config ideal**: Tool should work with intelligent defaults, require minimal setup
- **Language agnostic**: Architecture must support adding new languages easily
- **Privacy-first**: No code ever leaves the user's machine (connectors only fetch metadata)
- **Performance**: Index 100K LOC in <1 minute on average laptop
- **Offline-capable**: Core functionality works without internet (external connectors optional)
- **Developer-friendly**: Clear error messages, helpful warnings, good DX

## Questions to Answer in Your Plan

1. What's the exact schema format (provide JSON Schema)?
2. How do we handle language-specific quirks (Python docstrings vs JSDoc)?
3. What's the SQL schema for the graph database?
4. How do we version the index format for backward compatibility?
5. What's the incremental indexing strategy?
6. How do we handle large monorepos (100+ packages)?
7. What's the authentication flow for external connectors?
8. How do we test the MCP server integration?
9. What's the migration path for schema v1 → v2?
10. How do we make this extensible for community plugins?

## Getting Started

Begin by:
1. Creating a detailed technical specification document
2. Designing the v1.0 schema with examples
3. Setting up the repository structure
4. Implementing a proof-of-concept parser for Python
5. Building a minimal MCP server that can query parsed data

Focus on getting a working end-to-end demo (annotate Python file → parse → index → query via MCP) within the first 2-3 days. This validates the entire architecture before committing to full implementation.
