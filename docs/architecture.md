# KnowGraph Architecture

> Comprehensive technical architecture of the KnowGraph system -- an AI-navigable code documentation tool.

---

## Table of Contents

- [1. System Overview](#1-system-overview)
- [2. Monorepo Structure](#2-monorepo-structure)
- [3. Package Dependency Graph](#3-package-dependency-graph)
- [4. Data Flow: Annotation to AI Query](#4-data-flow-annotation-to-ai-query)
- [5. Core Package Architecture](#5-core-package-architecture)
  - [5.1 Type System (Zod Schemas)](#51-type-system-zod-schemas)
  - [5.2 Parser Engine](#52-parser-engine)
  - [5.3 Indexer Engine](#53-indexer-engine)
  - [5.4 Query Engine](#54-query-engine)
  - [5.5 Validation Engine](#55-validation-engine)
  - [5.6 Coverage Calculator](#56-coverage-calculator)
  - [5.7 Suggestion Engine](#57-suggestion-engine)
- [6. CLI Architecture](#6-cli-architecture)
- [7. MCP Server Architecture](#7-mcp-server-architecture)
- [8. Database Design](#8-database-design)
- [9. Build System and CI/CD](#9-build-system-and-cicd)
- [10. Key Design Principles](#10-key-design-principles)
- [11. Component Interaction Diagrams](#11-component-interaction-diagrams)

---

## 1. System Overview

KnowGraph bridges the gap between code documentation and AI assistants. Developers annotate their code with `@knowgraph` metadata (embedded in language-native comments), and KnowGraph extracts, validates, indexes, and serves that metadata to AI tools via the Model Context Protocol (MCP).

### The Pipeline

```
Source Code         Parsing          Indexing         Querying
with @knowgraph --> Extract YAML --> Store in   --> AI assistants
annotations         & validate      SQLite/FTS5     query via MCP
```

### What KnowGraph Captures

Each `@knowgraph` annotation describes a code entity (module, class, function, etc.) with:

- **Core metadata**: type, description, owner, status, tags, links
- **Business context**: business_goal, funnel_stage, revenue_impact
- **Dependencies**: services, external_apis, databases
- **Compliance**: regulations, data_sensitivity, audit_requirements
- **Operational**: SLA, on-call team, monitoring dashboards

This structured metadata enables AI assistants to understand not just *what* code does, but *why* it exists, *who* owns it, and *how* it connects to the business.

---

## 2. Monorepo Structure

KnowGraph is organized as a pnpm monorepo with Turborepo orchestration:

```
know-know/
  package.json              # Root workspace config
  turbo.json                # Build pipeline definition
  pnpm-workspace.yaml       # Workspace member paths
  CLAUDE.md                 # Project rules (also used for self-indexing)
  ROADMAP.md                # Human-readable roadmap
  roadmap/
    tracker.yml             # Machine-readable project tracker
    decisions.yml           # Architecture Decision Records (YAML)
  docs/                     # Project documentation
  .github/
    workflows/
      ci.yml                # Build, test, lint, typecheck
      release.yml           # npm publishing pipeline
  packages/
    core/                   # @knowgraph/core
      src/
        types/              # Zod schemas, TypeScript types
        parsers/            # Language-specific parsers
        indexer/            # SQLite database + file scanner
        query/              # Query engine with FTS5
        validation/         # Annotation validation rules
        coverage/           # Documentation coverage calculator
        suggest/            # File suggestion engine
        index.ts            # Public API barrel export
    cli/                    # @knowgraph/cli
      src/
        commands/           # CLI command implementations
        utils/              # Language detection, formatting
        index.ts            # Commander.js entrypoint
    mcp-server/             # @knowgraph/mcp-server
      src/
        tools/              # Individual MCP tool implementations
        server.ts           # MCP server factory
        db.ts               # Read-only database layer
        config.ts           # Claude Desktop config generator
        index.ts            # Entrypoint + exports
```

### Package Responsibilities

| Package | npm name | Purpose |
|---------|----------|---------|
| `core` | `@knowgraph/core` | Parsers, indexer, query engine, types, validation, coverage, suggestions |
| `cli` | `@knowgraph/cli` | Command-line interface (`knowgraph` command) |
| `mcp-server` | `@knowgraph/mcp-server` | MCP protocol server for AI assistant integration |

---

## 3. Package Dependency Graph

```
                    @knowgraph/cli
                   /              \
                  /                \
    @knowgraph/core      @knowgraph/mcp-server
                  \                /
                   \              /
                    @knowgraph/core
```

More precisely:

```
@knowgraph/cli
  depends on: @knowgraph/core (workspace:*)
  depends on: @knowgraph/mcp-server (workspace:*)

@knowgraph/mcp-server
  depends on: @knowgraph/core (workspace:*)
  depends on: @modelcontextprotocol/sdk
  depends on: better-sqlite3

@knowgraph/core
  depends on: better-sqlite3, glob, ignore, yaml, zod
  (no internal workspace dependencies)
```

The CLI package is the top-level consumer. It uses `@knowgraph/core` for parsing, indexing, and querying operations, and dynamically imports `@knowgraph/mcp-server` when the `serve` command is invoked. The MCP server uses `@knowgraph/core` types but has its own read-only database layer optimized for MCP tool responses.

---

## 4. Data Flow: Annotation to AI Query

The complete lifecycle of a KnowGraph annotation:

```
                                        DEVELOPER WORKFLOW
  +----------------+    +----------------+    +----------------+    +----------------+
  |  1. Annotate   |    |  2. Parse      |    |  3. Index      |    |  4. Query      |
  |  Source Code   |--->|  Extract YAML  |--->|  Store in DB   |--->|  Search & Use  |
  +----------------+    +----------------+    +----------------+    +----------------+
        |                      |                      |                      |
        v                      v                      v                      v
  /** @knowgraph       TypeScript/Python       SQLite with FTS5       CLI: knowgraph query
   * type: module      parser extracts         stores entities,       MCP: AI assistant
   * description: ...  JSDoc/docstring         tags, links,           queries via tools
   * owner: team-a     blocks, validates       relationships
   */                  via Zod schemas
```

### Step-by-Step Data Flow

**Step 1 -- Annotate**: Developer writes `@knowgraph` YAML inside language-native comments (JSDoc for TS/JS, docstrings for Python, generic comments for other languages).

**Step 2 -- Parse** (`knowgraph parse`):
1. Parser registry routes file to appropriate parser by extension
2. Language parser (TS, Python, or generic) extracts comment blocks
3. Metadata extractor finds `@knowgraph` marker and extracts YAML content
4. YAML is parsed and validated against Zod schemas (tries `ExtendedMetadataSchema` first, falls back to `CoreMetadataSchema`)
5. Parser infers entity name and context (class name, function signature, module name) from surrounding code

**Step 3 -- Index** (`knowgraph index`):
1. File scanner collects all files, respecting `.gitignore` and exclude patterns
2. For incremental indexing, MD5 hash comparison skips unchanged files
3. Each file is parsed; entities are inserted into SQLite with tags, links, and FTS5 entries
4. Dependency relationships from extended metadata are stored as graph edges
5. Entity IDs are deterministic SHA-256 hashes of `filePath:name:line`

**Step 4 -- Query** (`knowgraph query` or MCP tools):
1. Query engine builds SQL with dynamic WHERE clauses
2. FTS5 virtual table provides fast full-text search
3. Results are hydrated with tags and links from normalized tables
4. MCP server formats results as markdown for AI consumption

---

## 5. Core Package Architecture

The `@knowgraph/core` package is the heart of the system. It contains seven subsystems organized as a layered architecture:

```
                  +-------------------+
                  |    Public API     |  (index.ts - barrel exports)
                  +-------------------+
                           |
          +----------------+------------------+
          |                |                  |
  +-------+------+  +-----+-------+  +-------+-------+
  |    Types     |  |   Parsers   |  |   Validation  |
  | (Zod schemas)|  | (registry)  |  |  (rules)      |
  +--------------+  +------+------+  +-------+-------+
                           |
                    +------+------+
                    |   Indexer   |
                    |  (SQLite)   |
                    +------+------+
                           |
              +------------+------------+
              |            |            |
        +-----+-----+ +---+----+ +----+------+
        |   Query   | |Coverage| | Suggestion|
        |  Engine   | |  Calc  | |   Engine  |
        +-----------+ +--------+ +-----------+
```

### 5.1 Type System (Zod Schemas)

**Files**: `packages/core/src/types/entity.ts`, `manifest.ts`, `parse-result.ts`

Zod schemas serve as the single source of truth for both runtime validation and TypeScript types. The pattern is consistent throughout:

```typescript
// 1. Define Zod schema
export const EntityTypeSchema = z.enum([
  'module', 'class', 'function', 'method', 'service',
  'api_endpoint', 'variable', 'constant', 'interface', 'enum',
]);

// 2. Infer TypeScript type from schema
export type EntityType = z.infer<typeof EntityTypeSchema>;
```

**Schema hierarchy**:

```
CoreMetadataSchema                    # Required: type, description
  |                                   # Optional: owner, status, tags, links
  +-- extends --> ExtendedMetadataSchema
                    |                 # Adds: context, dependencies,
                    |                 #   compliance, operational
                    +-- ContextSchema
                    |     (business_goal, funnel_stage, revenue_impact)
                    +-- DependenciesSchema
                    |     (services, external_apis, databases)
                    +-- ComplianceSchema
                    |     (regulations, data_sensitivity, audit_requirements)
                    +-- OperationalSchema
                          (sla, on_call_team, monitoring_dashboards)
```

The `ManifestSchema` defines the `.knowgraph.yml` project configuration file structure, including parser settings, connector configs, and index options.

The `ParseResult` interface defines the standardized output from all language parsers:

```typescript
interface ParseResult {
  readonly name: string;        // Entity name (class name, function name, etc.)
  readonly filePath: string;
  readonly line: number;
  readonly column: number;
  readonly language: string;
  readonly entityType: EntityType;
  readonly metadata: CoreMetadata | ExtendedMetadata;
  readonly rawDocstring: string;
  readonly signature?: string;  // Function/method signature
  readonly parent?: string;     // Enclosing class name
}
```

### 5.2 Parser Engine

**Files**: `packages/core/src/parsers/`

The parser engine uses a **registry pattern** for pluggable language support.

**Architecture**:

```
ParserRegistry (registry.ts)
  |
  +-- register(parser) --> adds to parser list
  +-- getParser(filePath) --> match by extension, fallback to generic
  +-- parseFile(content, filePath) --> delegate to matched parser
  |
  +-- TypeScript Parser (typescript-parser.ts)
  |     Supported: .ts, .tsx, .js, .jsx, .mts, .cts
  |     Extracts: JSDoc blocks (/** ... */)
  |     Infers: class, function, arrow function, interface,
  |             type alias, enum, method declarations
  |
  +-- Python Parser (python-parser.ts)
  |     Supported: .py, .pyi
  |     Extracts: Docstrings (""" ... """)
  |     Infers: class, function, method, module definitions
  |
  +-- Generic Parser (generic-parser.ts)
        Supported: any extension (fallback)
        Extracts: Block comments (/* */), triple-quoted strings,
                  groups of single-line comments (// or #)
        Language map: 20+ languages by extension
```

**Parsing pipeline for a single file**:

```
File Content
    |
    v
Language Parser (TS/Python/Generic)
    |
    +-- 1. Find comment blocks (regex-based)
    |       TS: JSDOC_REGEX = /\/\*\*[\s\S]*?\*\//g
    |       Py: DOCSTRING_REGEX = /("""[\s\S]*?"""|'''[\s\S]*?''')/g
    |
    +-- 2. Strip comment syntax (*, /**, """, #)
    |
    +-- 3. Extract @knowgraph YAML (metadata-extractor.ts)
    |       - Find @knowgraph marker
    |       - Strip leading comment characters per line
    |       - Dedent to handle indented contexts
    |       - Parse YAML with 'yaml' library
    |
    +-- 4. Validate against Zod schemas
    |       - Try ExtendedMetadataSchema first
    |       - Fall back to CoreMetadataSchema
    |       - Return validation errors if both fail
    |
    +-- 5. Infer entity context from surrounding code
    |       TS: Match class/function/interface/enum declarations
    |       Py: Match class/def definitions above docstring
    |       Generic: Use module name from file path
    |
    v
ParseResult[]
```

**Key design choice**: The parsers use regex-based extraction rather than AST parsing. This was a deliberate decision (ADR-005) to prioritize implementation speed across multiple languages. Tree-sitter integration is planned for Phase 1b to handle edge cases.

### 5.3 Indexer Engine

**Files**: `packages/core/src/indexer/`

The indexer manages the SQLite database and file scanning pipeline.

**Components**:

```
createIndexer(parserRegistry, dbManager)
    |
    +-- File Scanner (indexer.ts)
    |     - Uses glob to collect files
    |     - Applies .gitignore patterns via 'ignore' library
    |     - Supports custom exclude patterns
    |     - Progress reporting via callback
    |
    +-- Database Manager (database.ts)
    |     - Wraps better-sqlite3
    |     - CRUD operations for entities, tags, links, relationships
    |     - FTS5 index management
    |     - Statistics aggregation
    |
    +-- Schema (schema.ts)
          - SQL table definitions
          - Prepared statement templates
```

**Incremental indexing** uses MD5 file hashing:

```
For each parsable file:
  1. Compute MD5 hash of file content
  2. Compare with stored hash in database
  3. If match -> skip (file unchanged)
  4. If mismatch:
     a. Delete all entities for this file path
     b. Re-parse the file
     c. Insert new entities with updated hash
```

**Entity ID generation** is deterministic:

```typescript
function generateEntityId(filePath: string, name: string, line: number): string {
  const raw = `${filePath}:${name}:${line}`;
  return createHash('sha256').update(raw).digest('hex');
}
```

This ensures the same entity always gets the same ID across re-indexes, enabling stable references.

### 5.4 Query Engine

**Files**: `packages/core/src/query/query-engine.ts`

The query engine provides a typed search API over the SQLite index.

**Query interface**:

```typescript
interface QueryEngine {
  search(options: QueryOptions): QueryResult;    // Full-text + filter search
  getEntity(id: string): StoredEntity | undefined;
  getDependencies(entityId: string): readonly StoredEntity[];
  getDependents(entityId: string): readonly StoredEntity[];
  getByOwner(owner: string): readonly StoredEntity[];
  getByTag(tag: string): readonly StoredEntity[];
  getStats(): IndexStats;
}
```

**Search implementation**: The `search` method dynamically builds SQL queries with optional filters:

```
QueryOptions { query?, type?, owner?, status?, tags?, filePath?, limit?, offset? }
    |
    v
Build WHERE clause:
  - query   -> FTS5 MATCH via entities_fts subquery
  - type    -> entity_type = ?
  - owner   -> owner = ?
  - status  -> status = ?
  - tags    -> entity_id IN (SELECT ... FROM tags WHERE tag IN (...))
  - filePath -> file_path = ?
    |
    v
Execute COUNT(*) for total
Execute SELECT with LIMIT/OFFSET
    |
    v
Hydrate each row with tags and links from normalized tables
    |
    v
QueryResult { entities, total, query }
```

**Dependency traversal** uses SQL JOINs on the `relationships` table:

```sql
-- Find what entity X depends on
SELECT e.* FROM entities e
  JOIN relationships r ON e.id = r.target_id
  WHERE r.source_id = ?

-- Find what depends on entity X
SELECT e.* FROM entities e
  JOIN relationships r ON e.id = r.source_id
  WHERE r.target_id = ?
```

### 5.5 Validation Engine

**Files**: `packages/core/src/validation/`

The validation engine checks annotation quality with pluggable rules.

**Architecture**:

```
createValidator(customRules?) --> Validator
    |
    +-- validate(rootDir, options?) --> ValidationResult
          |
          1. Collect parsable files (recursive directory walk)
          2. Parse each file with createDefaultRegistry()
          3. Run each ParseResult through all active rules
          4. Aggregate results: issues, errorCount, warningCount
```

**Built-in validation rules** (created via factory functions):

| Rule | Severity | What it checks |
|------|----------|----------------|
| `required-fields` | error | `description` must be present |
| `valid-status` | error | Status must be `experimental`, `stable`, or `deprecated` |
| `valid-type` | error | Entity type must be in `EntityTypeSchema` |
| `non-empty-tags` | warning | Tags array should not be empty when present |
| `owner-present` | warning | Owner field should be present |
| `description-length` | warning | Description should be at least 10 characters |

Rules implement the `ValidationRule` interface:

```typescript
interface ValidationRule {
  readonly name: string;
  readonly description: string;
  readonly severity: ValidationSeverity;
  check(parseResult: ParseResult): readonly ValidationIssue[];
}
```

### 5.6 Coverage Calculator

**Files**: `packages/core/src/coverage/`

Calculates what percentage of parsable files have `@knowgraph` annotations.

**Output structure**:

```typescript
interface CoverageResult {
  totalFiles: number;         // All parsable files found
  annotatedFiles: number;     // Files with at least one @knowgraph annotation
  percentage: number;         // annotatedFiles / totalFiles * 100
  byLanguage: CoverageBreakdown[];   // Grouped by .ts/.py/.js
  byDirectory: CoverageBreakdown[];  // Grouped by directory path
  byOwner: CoverageBreakdown[];      // Grouped by annotation owner
  files: FileCoverageInfo[];          // Per-file detail
}
```

### 5.7 Suggestion Engine

**Files**: `packages/core/src/suggest/`

Ranks unannotated files by annotation priority using heuristics.

**Scoring heuristics**:

| Heuristic | Score | Reason tag |
|-----------|-------|------------|
| Entry point file (index.ts, main.py, etc.) | +100 | `entry-point` |
| Large file (>200 lines) | +100 | `large-file` |
| Large file (>100 lines) | +50 | `large-file` |
| In `src/` directory | +20 | `exported-module` |
| Many imports (>10) | +60 | `many-imports` |
| Many imports (>5) | +30 | `many-imports` |
| Primary language (.ts, .tsx, .py) | +10 | -- |

**Exclusions**: Test files, config files, fixtures, and already-annotated files are excluded from suggestions.

---

## 6. CLI Architecture

**Package**: `@knowgraph/cli` -- `packages/cli/`

The CLI uses Commander.js and provides 9 commands:

```
knowgraph
  |
  +-- parse <path>     # Parse files, display extracted annotations
  +-- index [path]     # Build SQLite index from annotations
  +-- query <term>     # Search the code graph
  +-- serve            # Start MCP server for AI assistants
  +-- init             # Initialize .knowgraph.yml with language detection
  +-- validate         # Run validation rules on annotations
  +-- coverage         # Calculate documentation coverage
  +-- suggest          # Suggest high-impact files to annotate
  +-- hook             # Install/manage pre-commit hooks
```

**Command registration pattern**: Each command is a separate module that exports a `register*Command(program)` function. All commands are aggregated in `commands/index.ts` and registered in the main `index.ts`.

**CLI flow for `knowgraph index`**:

```
1. Resolve target path and output directory
2. Create output directory (.knowgraph/)
3. Initialize parser registry (createDefaultRegistry)
4. Create adapter bridging core ParserRegistry to indexer ParserRegistry interface
5. Open/create SQLite database at .knowgraph/knowgraph.db
6. Create indexer with registry + database manager
7. Run index with progress spinner (ora)
8. Display summary: files scanned, entities indexed, relationships, duration
```

**CLI flow for `knowgraph serve`**:

```
1. Check database file exists
2. Print Claude Desktop MCP config snippet
3. Dynamically import @knowgraph/mcp-server
4. Start MCP server with stdio transport
```

### Utility Modules

- **`detect.ts`**: Scans directories to detect project languages by file extension counts. Used by `knowgraph init`.
- **`format.ts`**: Table and JSON formatting for CLI output.

---

## 7. MCP Server Architecture

**Package**: `@knowgraph/mcp-server` -- `packages/mcp-server/`

The MCP server exposes the code knowledge graph to AI assistants via the Model Context Protocol.

### Server Initialization

```
createServer(options: { dbPath, verbose })
    |
    +-- Create McpServer instance (name: 'knowgraph')
    +-- Open SQLite database (read-only via better-sqlite3)
    +-- Register all 7 tools
    +-- Return server
    |
startServer(options)
    |
    +-- createServer(options)
    +-- Create StdioServerTransport
    +-- Connect server to transport
```

### MCP Tools

The server exposes 7 tools that AI assistants can call:

| Tool | Purpose | Parameters |
|------|---------|------------|
| `search_code` | Full-text search across entities | `query`, `type?`, `owner?`, `tags?`, `limit?` |
| `find_by_owner` | Find all entities owned by a team | `owner` |
| `find_by_business_goal` | Find entities related to a business goal | `goal` |
| `get_dependencies` | Get dependency graph for an entity | `entity_id`, `depth?` |
| `get_entity_details` | Get full details of a specific entity | `entity_id` |
| `get_external_knowledge` | Get external links (Notion, Jira, etc.) | `entity_id?` |
| `get_graph_overview` | Get codebase-wide statistics | (none) |

### MCP Database Layer

The MCP server has its own database layer (`db.ts`) separate from the core database manager. This is a read-only layer optimized for MCP query patterns:

- Opens database with `{ readonly: true, fileMustExist: true }`
- Uses WAL mode for concurrent read access
- Checks for FTS table existence and falls back to LIKE queries
- Supports BFS-based dependency traversal with configurable depth

### Response Formatting

All tool responses are formatted as markdown text (`format.ts`) for AI consumption:

```markdown
## EntityName (module)
**File:** src/parsers/registry.ts:24
**Description:** Parser registry that routes files to parsers
**Owner:** knowgraph-core
**Status:** stable
**Tags:** parser, registry, factory
```

---

## 8. Database Design

KnowGraph uses SQLite with FTS5 full-text search. The database file is stored at `.knowgraph/knowgraph.db`.

### Table Schema

```
+------------------+       +------------------+
|    entities       |       |  entities_fts    |
|------------------|       |  (FTS5 virtual)  |
| id (PK, SHA-256) |       |------------------|
| file_path        |       | entity_id        |
| name             |<------| name             |
| entity_type      |       | description      |
| description      |       | tags_text        |
| raw_docstring    |       | owner            |
| signature        |       +------------------+
| parent           |
| language         |
| line             |       +------------------+
| column_num       |       |  relationships   |
| owner            |       |------------------|
| status           |       | id (PK, auto)    |
| metadata_json    |  <----| source_id (FK)   |
| file_hash        |  <----| target_id (FK)   |
| created_at       |       | relationship_type|
| updated_at       |       +------------------+
+------------------+
        |
        | 1:N
        v
+------------------+       +------------------+
|      tags        |       |     links        |
|------------------|       |------------------|
| entity_id (FK)   |       | id (PK, auto)    |
| tag              |       | entity_id (FK)   |
| (composite PK)   |       | link_type        |
+------------------+       | url              |
                            | title            |
                            +------------------+
```

### Indexes

```sql
idx_entities_file_path  ON entities(file_path)
idx_entities_type       ON entities(entity_type)
idx_entities_owner      ON entities(owner)
idx_entities_status     ON entities(status)
idx_tags_tag            ON tags(tag)
idx_links_entity        ON links(entity_id)
idx_relationships_source ON relationships(source_id)
idx_relationships_target ON relationships(target_id)
```

### Database Configuration

- **Journal mode**: WAL (Write-Ahead Logging) for concurrent reads
- **Foreign keys**: Enabled with CASCADE deletes
- **FTS5**: Virtual table `entities_fts` indexes name, description, tags, and owner

### Metadata Storage

Full metadata JSON is stored in `metadata_json` column, preserving the complete Zod-validated structure. This enables forward compatibility -- new metadata fields can be added without schema migrations.

---

## 9. Build System and CI/CD

### Turborepo Pipeline

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test":  { "dependsOn": ["build"] },
    "lint":  {},
    "typecheck": { "dependsOn": ["^build"] }
  }
}
```

- `^build` means "build all dependencies first" (core before cli/mcp-server)
- Test depends on build to ensure TypeScript compilation succeeds
- Lint is independent and can run in parallel
- Typecheck depends on dependencies being built (for type resolution)

### CI Pipeline (GitHub Actions)

The `ci.yml` workflow runs on every push and pull request:

```
1. Checkout code
2. Setup pnpm (via pnpm/action-setup@v4)
3. Setup Node.js 20 with pnpm cache
4. pnpm install --frozen-lockfile
5. pnpm turbo build
6. pnpm turbo test -- --coverage   (80% minimum enforced)
7. pnpm turbo lint
8. pnpm turbo typecheck
```

Branch protection on `main` requires the `build-and-test` job to pass.

### Release Pipeline

The `release.yml` workflow triggers on GitHub release publication:

```
1. Build and test all packages
2. Publish in dependency order:
   a. @knowgraph/core
   b. @knowgraph/mcp-server
   c. @knowgraph/cli
3. Uses npm provenance for supply chain security
```

---

## 10. Key Design Principles

### Immutability

All data structures use `readonly` properties. Functions return new objects rather than mutating inputs. This applies consistently to:
- All interface properties (`readonly` keyword)
- Array return types (`readonly T[]`)
- Parse results, stored entities, query results, validation issues

### Factory Functions Over Classes

The codebase uses factory functions (`createParser()`, `createDatabaseManager()`, `createQueryEngine()`) rather than class constructors. This provides:
- Simpler encapsulation (closure-based private state)
- No `this` binding issues
- Easy composition and testing

### Zod as Single Source of Truth

Types are defined once as Zod schemas and TypeScript types are inferred via `z.infer<>`. This eliminates type/validation drift and provides:
- Runtime validation of user-authored metadata
- Clear error messages on validation failure
- Compile-time type safety throughout the codebase

### Self-Documentation

KnowGraph indexes itself. Every source file in the project has a `@knowgraph` annotation block. Running `knowgraph index .` on the repository produces a fully functional knowledge graph of its own codebase.

---

## 11. Component Interaction Diagrams

### Developer Workflow

```
Developer writes @knowgraph annotation
          |
          v
$ knowgraph parse src/             # Preview: shows extracted metadata
$ knowgraph validate src/          # Verify: checks annotation quality
$ knowgraph index .                # Build: creates .knowgraph/knowgraph.db
$ knowgraph query "auth"           # Search: find entities in terminal
$ knowgraph coverage .             # Measure: % of files annotated
$ knowgraph suggest                # Guide: which files to annotate next
$ knowgraph serve                  # Serve: start MCP server for AI
```

### AI Assistant Interaction

```
Claude Desktop / Claude Code
          |
          | stdio transport
          v
    MCP Server
          |
          | read-only SQLite queries
          v
    .knowgraph/knowgraph.db
          |
          | FTS5 + SQL
          v
    Query Results (markdown formatted)
          |
          v
    AI uses context for:
    - Understanding code ownership
    - Finding related components
    - Navigating business context
    - Discovering external docs
```

### Parsing Pipeline (Detailed)

```
                  Source File (e.g., auth-service.ts)
                             |
                    +--------+--------+
                    |                 |
              Extension Check    File Content
              (.ts -> TS Parser)      |
                    |                 v
                    v          Find JSDoc Blocks
             TS Parser              |
                    |         +-----+------+
                    v         |            |
              For each JSDoc block:  Other blocks
                    |         (no @knowgraph)
                    v              (skip)
              Has @knowgraph?
                    |
                Yes |
                    v
              Extract YAML after @knowgraph marker
                    |
                    v
              Strip comment chars (* # //)
                    |
                    v
              Dedent (handle indentation)
                    |
                    v
              Parse YAML (yaml library)
                    |
                    v
              Validate with Zod
              (Extended -> Core fallback)
                    |
                    v
              Infer entity from next code line:
              - class Foo         -> name: "Foo"
              - function bar()    -> name: "bar", signature
              - const baz = () => -> name: "baz"
              - interface Qux     -> name: "Qux"
              - (module level)    -> name from filename
                    |
                    v
              ParseResult {
                name, filePath, line, column,
                language, entityType, metadata,
                rawDocstring, signature?, parent?
              }
```
