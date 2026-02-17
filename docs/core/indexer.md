# Indexing Engine

The indexing engine scans a codebase, parses files for `@knowgraph` annotations, and stores the extracted entities in a SQLite database with FTS5 full-text search support.

## Architecture

```
indexer/
  types.ts      # StoredEntity, EntityInsert, IndexerOptions, IndexResult, etc.
  schema.ts     # SQL DDL and DML statements
  database.ts   # DatabaseManager: CRUD operations on SQLite
  indexer.ts    # File scanner and indexing orchestrator
  index.ts      # Re-exports
```

Data flows through the indexer as follows:

```
File system
  --> collectFiles() walks directory, applies .gitignore + exclude patterns
    --> Filter to parsable files
      --> For each file:
          1. Read content
          2. Compute MD5 hash
          3. Skip if hash unchanged (incremental mode)
          4. Delete old entities for file
          5. Parse file via parser registry
          6. Insert each ParseResult as an entity
          7. Insert tags, links, relationships
```

## SQLite Schema

The database uses five tables plus one FTS5 virtual table. All tables are created via `CREATE_TABLES_SQL` in `schema.ts`.

### entities

Primary storage for code entities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | SHA256 hash of `filePath:name:line` |
| `file_path` | TEXT | NOT NULL | Relative path from project root |
| `name` | TEXT | NOT NULL | Entity name (function, class, module name) |
| `entity_type` | TEXT | NOT NULL | One of the EntityType enum values |
| `description` | TEXT | NOT NULL | From metadata |
| `raw_docstring` | TEXT | | Original comment block text |
| `signature` | TEXT | | Function/method signature |
| `parent` | TEXT | | Enclosing class name (for methods) |
| `language` | TEXT | NOT NULL | Programming language |
| `line` | INTEGER | NOT NULL | Line number in source file |
| `column_num` | INTEGER | NOT NULL, DEFAULT 0 | Column number |
| `owner` | TEXT | | Team or person responsible |
| `status` | TEXT | | experimental, stable, or deprecated |
| `metadata_json` | TEXT | NOT NULL | Full metadata as JSON |
| `file_hash` | TEXT | | MD5 hash of file content |
| `created_at` | TEXT | DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | DEFAULT datetime('now') | Last update timestamp |

### relationships

Directed edges between entities (e.g., dependency relationships).

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `source_id` | TEXT | REFERENCES entities(id) ON DELETE CASCADE |
| `target_id` | TEXT | REFERENCES entities(id) ON DELETE CASCADE |
| `relationship_type` | TEXT | NOT NULL |

Unique constraint: `(source_id, target_id, relationship_type)` -- duplicate relationships are silently ignored via `INSERT OR IGNORE`.

### tags

Entity-to-tag mapping (many-to-many).

| Column | Type | Constraints |
|--------|------|-------------|
| `entity_id` | TEXT | REFERENCES entities(id) ON DELETE CASCADE |
| `tag` | TEXT | NOT NULL |

Primary key: `(entity_id, tag)`.

### links

External references attached to entities.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `entity_id` | TEXT | REFERENCES entities(id) ON DELETE CASCADE |
| `link_type` | TEXT | |
| `url` | TEXT | NOT NULL |
| `title` | TEXT | |

### entities_fts (FTS5 Virtual Table)

Full-text search index for fast text queries.

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
  entity_id UNINDEXED,
  name, description, tags_text, owner
);
```

The `entity_id` column is `UNINDEXED` -- it is stored for joining but not searched. The searchable columns are `name`, `description`, `tags_text` (space-separated tags), and `owner`.

### Indexes

```sql
CREATE INDEX idx_entities_file_path ON entities(file_path);
CREATE INDEX idx_entities_type ON entities(entity_type);
CREATE INDEX idx_entities_owner ON entities(owner);
CREATE INDEX idx_entities_status ON entities(status);
CREATE INDEX idx_tags_tag ON tags(tag);
CREATE INDEX idx_links_entity ON links(entity_id);
CREATE INDEX idx_relationships_source ON relationships(source_id);
CREATE INDEX idx_relationships_target ON relationships(target_id);
```

## DatabaseManager

Created via `createDatabaseManager(dbPath?)`. If no path is provided, uses an in-memory database (`:memory:`).

### Configuration

The database is configured with:
- `journal_mode = WAL` (Write-Ahead Logging for better concurrent read performance)
- `foreign_keys = ON` (enforces referential integrity and cascade deletes)

### Entity ID Generation

Entity IDs are deterministic SHA256 hashes:

```typescript
export function generateEntityId(filePath: string, name: string, line: number): string {
  const raw = `${filePath}:${name}:${line}`;
  return createHash('sha256').update(raw).digest('hex');
}
```

This ensures the same entity always gets the same ID, enabling stable references across re-indexing.

### Interface

```typescript
export interface DatabaseManager {
  readonly db: Database.Database;        // Raw better-sqlite3 instance
  initialize(): void;                    // Create tables and indexes
  close(): void;                         // Close database connection
  getEntityById(id: string): StoredEntity | undefined;
  getEntitiesByFilePath(filePath: string): readonly StoredEntity[];
  insertEntity(entity: EntityInsert): string;      // Returns entity ID
  updateEntity(id: string, entity: Partial<EntityInsert>): void;
  deleteEntitiesByFilePath(filePath: string): void;
  insertRelationship(sourceId: string, targetId: string, type: string): void;
  insertTags(entityId: string, tags: readonly string[]): void;
  insertLinks(entityId: string, links: readonly Link[]): void;
  getStats(): IndexStats;
  getFileHash(filePath: string): string | undefined;
}
```

### Key Operations

**insertEntity**: Inserts into `entities` table, creates FTS entry, and inserts any tags/links.

**updateEntity**: Merges partial updates with existing row values. Deletes and re-creates the FTS entry to keep search index current.

**deleteEntitiesByFilePath**: Deletes FTS entries first (by subquery), then deletes entities. Tags, links, and relationships are cascade-deleted by foreign key constraints.

**getFileHash**: Returns the `file_hash` of the first entity for a given file path. Used by the indexer for incremental change detection.

## Indexer

Created via `createIndexer(parserRegistry, dbManager)`.

### ParserRegistry (Indexer's View)

The indexer uses a slightly different `ParserRegistry` interface than the parser module:

```typescript
export interface ParserRegistry {
  readonly parse: (filePath: string, content: string) => readonly ParseResult[];
  readonly canParse: (filePath: string) => boolean;
}
```

### IndexerOptions

```typescript
export interface IndexerOptions {
  readonly rootDir: string;                              // Project root directory
  readonly outputDir?: string;                           // Database output directory
  readonly exclude?: readonly string[];                  // Patterns to exclude
  readonly incremental?: boolean;                        // Skip unchanged files (default: false)
  readonly onProgress?: (progress: IndexProgress) => void;  // Progress callback
}
```

### IndexProgress

```typescript
export interface IndexProgress {
  readonly totalFiles: number;
  readonly processedFiles: number;
  readonly currentFile: string;
  readonly entitiesFound: number;
}
```

### Indexing Workflow

1. **Collect files**: Use `globSync('**/*')` to find all files, then filter through `.gitignore` patterns (via the `ignore` library) and `exclude` patterns.

2. **Filter parsable files**: Keep only files where `parserRegistry.canParse(filePath)` returns true.

3. **Process each file**:
   - Read file content
   - Compute MD5 hash: `createHash('md5').update(content).digest('hex')`
   - **Incremental check**: If `incremental: true` and the stored hash matches, skip the file
   - Delete existing entities for this file path
   - Parse the file to get `ParseResult[]`
   - For each result, call `dbManager.insertEntity()` with all metadata
   - If extended metadata includes `dependencies`, create `depends_on` relationships

4. **Report progress**: Call `onProgress` after each file and at completion.

5. **Return result**:

```typescript
export interface IndexResult {
  readonly totalFiles: number;          // Number of parsable files found
  readonly totalEntities: number;       // Number of entities indexed
  readonly totalRelationships: number;  // Number of relationships created
  readonly errors: readonly IndexError[];  // Files that failed to parse
  readonly duration: number;            // Total time in milliseconds
}
```

### Incremental Indexing

When `incremental: true`:

1. For each file, query `dbManager.getFileHash(relPath)` to get the stored MD5 hash
2. Compute the current file's MD5 hash
3. If they match, skip the file entirely (no re-parse, no re-insert)
4. If they differ (or no stored hash exists), re-index the file

This avoids re-processing unchanged files, significantly speeding up repeated indexing runs.

### Default Exclude Patterns

```typescript
const defaults = ['node_modules', '.git', 'dist', 'build'];
```

Additionally, `.gitignore` patterns from the project root are loaded and applied.

### Error Handling

File-level errors are caught and collected in the `errors` array rather than aborting the entire indexing operation:

```typescript
export interface IndexError {
  readonly filePath: string;
  readonly message: string;
  readonly error?: unknown;
}
```

## Stored Entity Type

The fully hydrated entity type returned from the database:

```typescript
export interface StoredEntity {
  readonly id: string;
  readonly filePath: string;
  readonly name: string;
  readonly entityType: EntityType;
  readonly description: string;
  readonly rawDocstring: string | null;
  readonly signature: string | null;
  readonly parent: string | null;
  readonly language: string;
  readonly line: number;
  readonly column: number;
  readonly owner: string | null;
  readonly status: Status | null;
  readonly metadata: CoreMetadata | ExtendedMetadata;
  readonly tags: readonly string[];
  readonly links: readonly Link[];
  readonly fileHash: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

## IndexStats

```typescript
export interface IndexStats {
  readonly totalEntities: number;
  readonly totalRelationships: number;
  readonly totalTags: number;
  readonly totalLinks: number;
  readonly entitiesByType: Readonly<Record<string, number>>;
  readonly entitiesByLanguage: Readonly<Record<string, number>>;
}
```

## Exports

```typescript
import {
  // Database
  createDatabaseManager,
  generateEntityId,
  type DatabaseManager,
  CREATE_TABLES_SQL,
  // Indexer
  createIndexer,
  type ParserRegistry,
  type ParserFn,
  // Types
  type StoredEntity,
  type EntityInsert,
  type IndexStats,
  type IndexerOptions,
  type IndexProgress,
  type IndexResult,
  type IndexError,
} from '@knowgraph/core';
```

Source files:
- `packages/core/src/indexer/schema.ts`
- `packages/core/src/indexer/database.ts`
- `packages/core/src/indexer/indexer.ts`
- `packages/core/src/indexer/types.ts`
