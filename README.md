# CodeGraph

> Make your codebase AI-navigable by bridging code documentation with business context

CodeGraph is an open-source documentation orchestration tool that extracts structured metadata from code annotations and builds a queryable knowledge graph. AI coding assistants can then understand not just *what* your code does, but *why* it exists and how it connects to business goals.

## The Problem

AI coding assistants are great at reading code, but they lack context about:
- **Why** a module exists and what business goal it serves
- **Who** owns it and what team to contact
- **Where** the design docs, Jira tickets, and monitoring dashboards live
- **What** compliance requirements apply (GDPR, PCI-DSS, SOC2)
- **How** it fits into the bigger picture (dependencies, funnel stage, revenue impact)

CodeGraph solves this by letting you annotate your code with structured metadata that AI assistants can query.

## Features

- **Language-agnostic** -- Python, TypeScript/JavaScript, Go, Java, and any language via the generic comment parser
- **AI-native** -- MCP server provides 7 tools for Claude Desktop and Claude Code integration
- **Business context** -- Connect code to business goals, funnel stages, compliance, and external docs
- **Zero friction** -- Works with existing codebases using standard comments and docstrings
- **Fast** -- SQLite-backed FTS5 index for instant full-text search
- **Extensible** -- Plugin architecture for parsers and query tools

## Quick Start

### Installation

```bash
npm install -g @codegraph/cli
# or
pnpm add -g @codegraph/cli
```

### 1. Annotate your code

Add `@codegraph` annotations to your existing docstrings and comments:

**Python:**
```python
def process_payment(customer_id: str, amount_cents: int) -> PaymentResult:
    """
    @codegraph
    type: function
    description: Processes a one-time payment charge through Stripe
    owner: payments-team
    status: stable
    tags: [payments, charge, stripe]
    context:
      funnel_stage: revenue
      revenue_impact: critical
    compliance:
      regulations: [PCI-DSS]
      data_sensitivity: restricted
    """
    pass
```

**TypeScript:**
```typescript
/**
 * @codegraph
 * type: class
 * description: REST controller handling user CRUD operations
 * owner: platform-team
 * status: stable
 * tags: [users, api, rest]
 * context:
 *   business_goal: Core user management for the platform
 *   funnel_stage: activation
 *   revenue_impact: high
 * compliance:
 *   regulations: [GDPR]
 *   data_sensitivity: confidential
 */
export class UserController {
  // ...
}
```

**Go:**
```go
// codegraph:
//   type: function
//   description: HTTP handler for user registration
//   owner: auth-team
//   status: stable
//   tags: [auth, registration, http]
func HandleRegister(w http.ResponseWriter, r *http.Request) {
    // ...
}
```

**Java:**
```java
/**
 * @codegraph
 * type: class
 * description: Service handling payment processing and refunds
 * owner: payments-team
 * status: stable
 * tags: [payments, billing]
 */
public class PaymentService {
    // ...
}
```

### 2. Build the index

```bash
codegraph index ./src
```

This parses all annotated files and creates a SQLite database at `.codegraph/codegraph.db`.

### 3. Query your codebase

```bash
# Full-text search
codegraph query "authentication"

# Filter by owner
codegraph query --owner "auth-team"

# Filter by tags
codegraph query --tags "security,auth"

# Filter by entity type
codegraph query --type "function"
```

### 4. Connect to Claude Code / Claude Desktop

Start the MCP server:

```bash
codegraph serve
```

Or add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "codegraph": {
      "command": "codegraph",
      "args": ["serve", "--db", ".codegraph/codegraph.db"]
    }
  }
}
```

## Annotation Format

All annotations use YAML inside your language's standard comment format, prefixed with `@codegraph` (or `codegraph:` for Go-style comments).

### Core Fields (required: `type`, `description`)

| Field | Type | Description |
|-------|------|-------------|
| `type` | enum | Entity kind: `module`, `class`, `function`, `method`, `service`, `api_endpoint`, `variable`, `constant`, `interface`, `enum` |
| `description` | string | Human-readable description of the entity's purpose |
| `owner` | string | Team or individual responsible |
| `status` | enum | `experimental`, `stable`, `deprecated` |
| `tags` | string[] | Freeform tags for categorization |
| `links` | Link[] | External references (Notion, Jira, GitHub, etc.) |

### Extended Fields (all optional)

| Field | Type | Description |
|-------|------|-------------|
| `context.business_goal` | string | Business objective this entity supports |
| `context.funnel_stage` | enum | AARRR stage: `awareness`, `acquisition`, `activation`, `retention`, `revenue`, `referral` |
| `context.revenue_impact` | enum | `critical`, `high`, `medium`, `low`, `none` |
| `dependencies.services` | string[] | Internal service dependencies |
| `dependencies.external_apis` | string[] | External API integrations |
| `dependencies.databases` | string[] | Database systems used |
| `compliance.regulations` | string[] | Applicable regulations (GDPR, PCI-DSS, SOC2, HIPAA) |
| `compliance.data_sensitivity` | enum | `public`, `internal`, `confidential`, `restricted` |
| `compliance.audit_requirements` | string[] | Specific audit/logging requirements |
| `operational.sla` | string | Service level agreement |
| `operational.on_call_team` | string | On-call team |
| `operational.monitoring_dashboards` | Dashboard[] | Links to monitoring dashboards |

### Link Format

```yaml
links:
  - type: notion          # notion | jira | linear | confluence | github | custom
    url: https://notion.so/my-doc
    title: Design Document
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `codegraph init` | Initialize CodeGraph in a project (creates `.codegraph/` directory) |
| `codegraph parse <path>` | Parse annotated files and output extracted entities as JSON |
| `codegraph index <path>` | Parse and index files into the SQLite database |
| `codegraph query <text>` | Search the index with full-text search and filters |
| `codegraph serve` | Start the MCP server for AI assistant integration |

## MCP Server Tools

When running as an MCP server, CodeGraph exposes 7 tools:

| Tool | Description |
|------|-------------|
| `search_code` | Full-text search across entity names, descriptions, and tags |
| `find_by_owner` | Find all entities owned by a specific team or person |
| `find_by_business_goal` | Discover entities related to a business objective or funnel stage |
| `get_dependencies` | Map dependencies for an entity (services, APIs, databases) |
| `get_entity_details` | Get complete metadata for a specific entity |
| `get_external_knowledge` | Find linked external resources (Notion, Jira, dashboards) |
| `graph_overview` | Get high-level statistics about the indexed codebase |

## Architecture

```
                    Annotated Source Code
                           |
                    [Parser Registry]
                     /      |      \
              Python    TypeScript   Generic
              Parser     Parser      Parser
                     \      |      /
                    [Metadata Extractor]
                           |
                     [SQLite Indexer]
                     (FTS5 full-text)
                           |
                    [Query Engine]
                     /           \
                [CLI]          [MCP Server]
                                  |
                          Claude Desktop /
                           Claude Code
```

### Packages

| Package | Description |
|---------|-------------|
| `@codegraph/core` | Parsers, indexer, query engine |
| `@codegraph/cli` | Command-line interface |
| `@codegraph/mcp-server` | MCP server for AI integration |

## Examples

The `examples/` directory contains fully annotated sample projects:

- **`examples/python-fastapi/`** -- E-commerce API with 30+ annotated entities covering auth, users, products, orders, payments, and notifications
- **`examples/typescript-express/`** -- Blog platform API with 30+ annotated entities covering auth, users, posts, comments, email, and validation

These examples demonstrate all annotation features including business context, compliance metadata, dependencies, operational info, and external links.

## Development

```bash
# Clone and install
git clone https://github.com/example/codegraph.git
cd codegraph
pnpm install

# Build all packages
pnpm turbo build

# Run tests
pnpm turbo test

# Type checking
pnpm turbo typecheck
```

## License

MIT
