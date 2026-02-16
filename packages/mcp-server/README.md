# @knowgraph/mcp-server

MCP (Model Context Protocol) server for [KnowGraph](https://github.com/idosams/know-know) — connect your code knowledge graph to AI assistants.

## Installation

```bash
npm install -g @knowgraph/cli
# The MCP server is included with the CLI
```

Or install standalone:

```bash
npm install @knowgraph/mcp-server
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "knowgraph": {
      "command": "knowgraph",
      "args": ["serve", "--db", "/path/to/project/.knowgraph/knowgraph.db"]
    }
  }
}
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `search_code` | Full-text search across entity names, descriptions, and tags |
| `find_by_owner` | Find all entities owned by a specific team or person |
| `find_by_business_goal` | Discover entities related to a business objective |
| `get_dependencies` | Map dependencies for an entity (services, APIs, databases) |
| `get_entity_details` | Get complete metadata for a specific entity |
| `get_external_knowledge` | Find linked external resources (Notion, Jira, dashboards) |
| `graph_overview` | Get high-level statistics about the indexed codebase |

## Documentation

See the [main repository](https://github.com/idosams/know-know) for full documentation, annotation format, and examples.

## License

MIT
