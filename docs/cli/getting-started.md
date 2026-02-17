# CLI Getting Started

This guide walks you through installing KnowGraph, annotating your code, and building a searchable knowledge graph of your codebase.

## Installation

### Using npm

```bash
npm install -g @knowgraph/cli
```

### Using pnpm (recommended for monorepos)

```bash
pnpm add -g @knowgraph/cli
```

### Using npx (no install required)

```bash
npx @knowgraph/cli <command>
```

### Verify Installation

```bash
knowgraph --version
# 0.2.0
```

## Quick Start

### 1. Initialize Your Project

Run `knowgraph init` in your project root. This creates a `.knowgraph.yml` configuration file:

```bash
cd /path/to/your/project
knowgraph init
```

The command will:
- Detect languages used in your project (TypeScript, Python, JavaScript, Go, Rust, Java)
- Prompt for a project name (or use `--yes` for defaults)
- Create `.knowgraph.yml` with sensible defaults
- Suggest high-impact files to annotate first

For non-interactive usage (CI, scripts):

```bash
knowgraph init --name my-project --yes
```

### 2. Add Annotations to Your Code

Add `@knowgraph` annotations as YAML blocks inside JSDoc (TypeScript/JavaScript) or docstrings (Python). Place them **before imports**, at the top of each file:

**TypeScript / JavaScript:**

```typescript
/**
 * @knowgraph
 * type: service
 * description: Handles user authentication and session management
 * owner: platform-team
 * status: stable
 * tags: [auth, security]
 * context:
 *   business_goal: User acquisition and retention
 *   domain: identity
 * links:
 *   - type: notion
 *     url: https://notion.so/auth-design
 *     title: Auth Design Doc
 */
import express from 'express';
```

**Python:**

```python
"""
@knowgraph
type: module
description: Payment processing pipeline
owner: payments-team
status: stable
tags: [payments, billing]
context:
  business_goal: Revenue processing
  domain: billing
"""
import stripe
```

### 3. Preview Annotations

Before indexing, preview what KnowGraph found in a file or directory:

```bash
# Parse a single file
knowgraph parse src/auth/service.ts

# Parse an entire directory
knowgraph parse src/

# Pretty-printed JSON output
knowgraph parse src/ --pretty

# YAML output format
knowgraph parse src/ --format yaml
```

### 4. Build the Index

Build the SQLite knowledge graph index:

```bash
knowgraph index
```

This scans your project, extracts all `@knowgraph` annotations, and stores them in `.knowgraph/knowgraph.db`.

### 5. Search the Graph

Query the knowledge graph from your terminal:

```bash
# Full-text search
knowgraph query "authentication"

# Filter by entity type
knowgraph query "payment" --type function

# Filter by team ownership
knowgraph query "" --owner platform-team

# JSON output for scripting
knowgraph query "auth" --format json
```

### 6. Start the MCP Server

Connect your AI assistant (Claude, Cursor, etc.) to the knowledge graph:

```bash
knowgraph serve
```

This starts an MCP (Model Context Protocol) server that exposes your knowledge graph to AI tools.

## Configuration

KnowGraph is configured via `.knowgraph.yml` in your project root. Here is a complete example:

```yaml
version: "1.0"
name: my-project
languages:
  - typescript
  - python
include:
  - "packages/*/src/**/*"
  - "src/**/*"
exclude:
  - node_modules
  - dist
  - .git
  - .turbo
  - coverage
  - __tests__
  - "*.test.ts"
  - "*.spec.ts"
index:
  output_dir: .knowgraph
  incremental: true
```

### Configuration Fields

| Field | Description | Default |
|-------|-------------|---------|
| `version` | Config format version | `"1.0"` |
| `name` | Project name | Directory name |
| `languages` | Supported languages to scan | Auto-detected |
| `include` | Glob patterns for files to include | `["**/*"]` |
| `exclude` | Glob patterns for files to exclude | Common build artifacts |
| `index.output_dir` | Where to store the SQLite database | `.knowgraph` |
| `index.incremental` | Only re-index changed files | `true` |

## Common Workflows

### CI/CD Integration

Add annotation validation and coverage checks to your CI pipeline:

```yaml
# GitHub Actions example
- name: Validate annotations
  run: knowgraph validate --strict

- name: Check coverage threshold
  run: knowgraph coverage --threshold 80

- name: Build index
  run: knowgraph index
```

### Pre-Commit Hook

Install a git pre-commit hook that validates annotations on every commit:

```bash
# Install the hook
knowgraph hook install

# Check hook status
knowgraph hook status

# Remove the hook
knowgraph hook uninstall
```

The hook validates `@knowgraph` annotations in all staged `.ts`, `.tsx`, `.js`, `.jsx`, and `.py` files. If any annotation is invalid, the commit is blocked.

### Finding Files to Annotate

Use the `suggest` command to discover which unannotated files would have the most impact:

```bash
knowgraph suggest
```

This ranks files by factors like file size, number of imports, and whether they are entry points. Annotate suggested files first for maximum knowledge graph value.

### Team Ownership Report

Query the graph by owner to see what each team is responsible for:

```bash
knowgraph query "" --owner platform-team --format json
```

### Coverage Monitoring

Track how much of your codebase is annotated, broken down by language, directory, or team:

```bash
# Full coverage report
knowgraph coverage

# JSON for dashboards
knowgraph coverage --format json

# By-language breakdown only
knowgraph coverage --by language

# Fail if below 80%
knowgraph coverage --threshold 80
```

## Supported Languages

KnowGraph parses annotations from:

| Language | File Extensions |
|----------|----------------|
| TypeScript | `.ts`, `.tsx` |
| JavaScript | `.js`, `.jsx` |
| Python | `.py` |

Language detection for `knowgraph init` also recognizes Go (`.go`), Rust (`.rs`), and Java (`.java`), though parser support for those languages is planned for future releases.

## Output Formats

Most commands support multiple output formats:

| Format | Description | Use Case |
|--------|-------------|----------|
| `table` | Human-readable aligned table | Terminal use |
| `json` | Machine-readable JSON | Scripting, piping |
| `yaml` | YAML output (parse command only) | Configuration files |
| `text` | Human-readable text (validate, suggest) | Terminal use |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (invalid path, validation failure, coverage below threshold, database not found) |

## Next Steps

- [CLI Command Reference](./commands.md) -- Complete reference for all commands
- [MCP Server Overview](../mcp-server/overview.md) -- Connect AI assistants to your knowledge graph
- [Annotation Guide](../guides/annotation-guide.md) -- Full annotation syntax and best practices
