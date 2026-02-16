# @codegraph/cli

Command-line interface for [CodeGraph](https://github.com/idosams/know-know) — make your codebase AI-navigable.

## Installation

```bash
npm install -g @codegraph/cli
# or
npx @codegraph/cli <command>
```

## Commands

| Command | Description |
|---------|-------------|
| `codegraph init` | Initialize CodeGraph in a project (creates `.codegraph.yml`) |
| `codegraph parse <path>` | Parse annotated files and output extracted entities |
| `codegraph index [path]` | Build the SQLite index from annotated source files |
| `codegraph query <term>` | Search the index with full-text search and filters |
| `codegraph serve` | Start the MCP server for AI assistant integration |

## Quick Start

```bash
# Initialize in your project
codegraph init

# Add @codegraph annotations to your code, then index
codegraph index ./src

# Search your codebase
codegraph query "authentication"
codegraph query --owner "auth-team"
codegraph query --tags "security,auth"

# Start MCP server for Claude integration
codegraph serve
```

## Documentation

See the [main repository](https://github.com/idosams/know-know) for full documentation, annotation format, and examples.

## License

MIT
