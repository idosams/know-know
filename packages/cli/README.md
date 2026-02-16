# @knowgraph/cli

Command-line interface for [KnowGraph](https://github.com/idosams/know-know) — make your codebase AI-navigable.

## Installation

```bash
npm install -g @knowgraph/cli
# or
npx @knowgraph/cli <command>
```

## Commands

| Command | Description |
|---------|-------------|
| `knowgraph init` | Initialize KnowGraph in a project (creates `.knowgraph.yml`) |
| `knowgraph parse <path>` | Parse annotated files and output extracted entities |
| `knowgraph index [path]` | Build the SQLite index from annotated source files |
| `knowgraph query <term>` | Search the index with full-text search and filters |
| `knowgraph serve` | Start the MCP server for AI assistant integration |

## Quick Start

```bash
# Initialize in your project
knowgraph init

# Add @knowgraph annotations to your code, then index
knowgraph index ./src

# Search your codebase
knowgraph query "authentication"
knowgraph query --owner "auth-team"
knowgraph query --tags "security,auth"

# Start MCP server for Claude integration
knowgraph serve
```

## Documentation

See the [main repository](https://github.com/idosams/know-know) for full documentation, annotation format, and examples.

## License

MIT
