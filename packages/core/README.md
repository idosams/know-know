# @knowgraph/core

Core library for [KnowGraph](https://github.com/idosams/know-know) — parsers, indexer, query engine, and type definitions.

## Installation

```bash
npm install @knowgraph/core
```

## What's Included

- **Parsers** — Language-specific parsers for Python, TypeScript/JavaScript, and a generic comment parser
- **Metadata Extractor** — Extracts and validates `@knowgraph` YAML metadata from code comments
- **Indexer** — SQLite-backed indexer with FTS5 full-text search
- **Query Engine** — Search and filter indexed entities by text, owner, tags, type, and status
- **Types** — Zod schemas and TypeScript types for entities, metadata, and manifests

## Usage

```typescript
import {
  createDefaultRegistry,
  createIndexer,
  createQueryEngine,
} from '@knowgraph/core';

// Parse files
const registry = createDefaultRegistry();
const results = registry.parse(fileContent, 'src/auth.ts');

// Index a project
const indexer = createIndexer({ dbPath: '.knowgraph/knowgraph.db' });
await indexer.indexDirectory('./src');

// Query the index
const engine = createQueryEngine('.knowgraph/knowgraph.db');
const entities = engine.search('authentication', { owner: 'auth-team' });
```

## Documentation

See the [main repository](https://github.com/idosams/know-know) for full documentation, annotation format, and examples.

## License

MIT
