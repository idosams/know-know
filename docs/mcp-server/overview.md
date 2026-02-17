# MCP Server Overview

The `@knowgraph/mcp-server` package exposes the KnowGraph knowledge graph to AI assistants via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/).

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that allows AI assistants to interact with external tools and data sources. It provides a structured way for AI models to:

- Discover available tools and their schemas
- Call tools with typed parameters
- Receive structured responses

MCP uses a client-server architecture where AI assistants (like Claude, Cursor, or other MCP-compatible tools) act as clients, and your application acts as a server that exposes tools.

## How KnowGraph Integrates with MCP

KnowGraph's MCP server bridges your code knowledge graph with AI assistants:

```
AI Assistant (Claude, Cursor, etc.)
        |
        | MCP Protocol (stdio transport)
        |
   KnowGraph MCP Server
        |
        | SQL queries
        |
   SQLite Database (.knowgraph/knowgraph.db)
        |
        | Built by `knowgraph index`
        |
   Your Codebase (@knowgraph annotations)
```

When an AI assistant needs to understand your codebase, it can use KnowGraph's MCP tools to:

1. **Search** for code entities by keyword, type, or tag
2. **Browse** entities by team ownership or business goal
3. **Explore** dependency relationships between components
4. **Look up** detailed metadata for specific entities
5. **Find** external documentation links (Notion, Jira, Confluence, etc.)
6. **Get** a high-level overview of the entire codebase

## Architecture

### Server Factory (`server.ts`)

The server is created via `createServer(options)`:

- Initializes an `McpServer` instance from the `@modelcontextprotocol/sdk`
- Opens the SQLite database in **read-only** mode
- Registers all 7 MCP tools
- If the database cannot be opened, registers a single fallback tool (`get_graph_overview`) that reports the error

```typescript
import { createServer, startServer } from '@knowgraph/mcp-server';

// Programmatic usage
const server = createServer({ dbPath: '.knowgraph/knowgraph.db' });

// Or start directly with stdio transport
await startServer({ dbPath: '.knowgraph/knowgraph.db', verbose: true });
```

### Server Options

```typescript
interface ServerOptions {
  readonly dbPath: string;    // Path to the SQLite database
  readonly verbose?: boolean; // Enable verbose logging
}
```

### Database Layer (`db.ts`)

The database layer provides a read-only interface to the SQLite knowledge graph:

- Opens the database with `better-sqlite3` in read-only mode (`readonly: true, fileMustExist: true`)
- Uses WAL journal mode for concurrent read access
- Supports FTS5 (full-text search) when the `entities_fts` table exists, with fallback to LIKE-based search
- Exposes the `McpDatabase` interface with the following methods:

```typescript
interface McpDatabase {
  search(query: string, filters?: SearchFilters): readonly EntityRow[];
  getById(id: string): EntityRow | undefined;
  getByOwner(owner: string): readonly EntityRow[];
  getDependencies(entityId: string, depth?: number): readonly DependencyRow[];
  getLinks(entityId?: string): readonly LinkRow[];
  getByBusinessGoal(goal: string): readonly EntityRow[];
  getStats(): GraphStats;
  close(): void;
}
```

### Database Schema

The knowledge graph database contains three tables:

**entities** -- Core table storing all code entities:

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Unique entity identifier |
| `name` | TEXT | Entity name (function, class, module name) |
| `file_path` | TEXT | Source file path |
| `line` | INTEGER | Line number in source file |
| `column` | INTEGER | Column number in source file |
| `language` | TEXT | Programming language |
| `entity_type` | TEXT | Entity type (function, class, module, service, interface) |
| `description` | TEXT | Human-readable description |
| `owner` | TEXT | Team or person responsible |
| `status` | TEXT | Status: experimental, stable, deprecated |
| `tags` | TEXT | Comma-separated tags |
| `signature` | TEXT | Function/class signature |
| `parent` | TEXT | Parent entity ID |
| `raw_docstring` | TEXT | Original docstring content |
| `business_goal` | TEXT | Business context goal |
| `funnel_stage` | TEXT | Funnel stage (acquisition, activation, revenue, etc.) |
| `revenue_impact` | TEXT | Revenue impact level |
| `dependencies` | TEXT | JSON serialized dependency info |
| `compliance` | TEXT | Compliance requirements (JSON) |
| `operational` | TEXT | Operational metadata (JSON) |

**links** -- External documentation links:

| Column | Type | Description |
|--------|------|-------------|
| `entity_id` | TEXT (FK) | References entities.id |
| `type` | TEXT | Link type (notion, jira, confluence, linear, etc.) |
| `url` | TEXT | External URL |
| `title` | TEXT | Link title |

**dependencies** -- Relationships between entities:

| Column | Type | Description |
|--------|------|-------------|
| `source_id` | TEXT (FK) | Source entity ID |
| `target_id` | TEXT (FK) | Target entity ID |
| `dependency_type` | TEXT | Relationship type (imports, calls, extends, etc.) |

**entities_fts** -- FTS5 virtual table for full-text search:

| Column | Source |
|--------|--------|
| `name` | entities.name |
| `description` | entities.description |
| `tags` | entities.tags |
| `business_goal` | entities.business_goal |

### Configuration Generator (`config.ts`)

The `generateClaudeDesktopConfig(projectPath)` function creates a configuration object for Claude Desktop:

```typescript
import { generateClaudeDesktopConfig } from '@knowgraph/mcp-server';

const config = generateClaudeDesktopConfig('/path/to/project');
// {
//   mcpServers: {
//     knowgraph: {
//       command: "node",
//       args: [
//         "/path/to/project/node_modules/@knowgraph/mcp-server/dist/index.js",
//         "/path/to/project/.knowgraph/knowgraph.db"
//       ]
//     }
//   }
// }
```

## Starting the Server

### Via CLI (Recommended)

The simplest way to start the MCP server:

```bash
# Index first
knowgraph index

# Start the server
knowgraph serve
```

### Direct Execution

The MCP server package can also be run directly:

```bash
node node_modules/@knowgraph/mcp-server/dist/index.js .knowgraph/knowgraph.db
```

With verbose logging:

```bash
node node_modules/@knowgraph/mcp-server/dist/index.js .knowgraph/knowgraph.db --verbose
```

### Programmatic Usage

```typescript
import { createServer, startServer } from '@knowgraph/mcp-server';

// Option 1: Start with stdio transport
await startServer({
  dbPath: '.knowgraph/knowgraph.db',
  verbose: true,
});

// Option 2: Create server for custom transport
const server = createServer({
  dbPath: '.knowgraph/knowgraph.db',
});
// Attach to your own transport...
```

## Client Configuration

### Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "knowgraph": {
      "command": "npx",
      "args": ["knowgraph", "serve", "--db", "/absolute/path/to/.knowgraph/knowgraph.db"]
    }
  }
}
```

### Claude Code

Add to your `.claude/settings.json` or project-level `.claude.json`:

```json
{
  "mcpServers": {
    "knowgraph": {
      "command": "npx",
      "args": ["knowgraph", "serve", "--db", "/absolute/path/to/.knowgraph/knowgraph.db"]
    }
  }
}
```

### Cursor

Configure in Cursor's MCP settings with the same command and args pattern.

### Any MCP-Compatible Client

The server uses **stdio transport**, so any MCP client that supports stdio can connect:

```json
{
  "command": "npx",
  "args": ["knowgraph", "serve", "--db", "<path-to-db>"]
}
```

## Registered Tools

The server registers 7 tools:

| Tool | Description |
|------|-------------|
| `search_code` | Full-text search across code entities |
| `find_code_by_owner` | Find entities owned by a team/person |
| `find_code_by_business_goal` | Find entities by business context |
| `get_code_dependencies` | Get dependency tree for an entity |
| `get_entity_details` | Get full metadata for an entity |
| `get_external_knowledge` | Get documentation links (Notion, Jira, etc.) |
| `get_graph_overview` | Get codebase statistics and summary |

For detailed schemas and examples, see the [MCP Tools Reference](./tools.md).

## Error Handling

- If the database file does not exist when starting the server, only the `get_graph_overview` tool is registered, and it returns an error message instructing the user to run `knowgraph index`
- All tool handlers catch errors and return structured error responses with `isError: true`
- The database is opened in read-only mode, so the server cannot modify the index

## Next Steps

- [MCP Tools Reference](./tools.md) -- Detailed schemas, parameters, and examples for each tool
- [CLI Command Reference](../cli/commands.md) -- How to build the index with `knowgraph index`
- [CLI Getting Started](../cli/getting-started.md) -- Full setup walkthrough
