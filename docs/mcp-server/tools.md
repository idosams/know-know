# MCP Tools Reference

Complete reference for all tools exposed by the KnowGraph MCP server. Each tool is available to any MCP-compatible AI assistant connected to the server.

---

## search_code

Search for code entities by description, name, or tags. This is the primary discovery tool for finding relevant code in the knowledge graph.

### Schema

```json
{
  "name": "search_code",
  "description": "Search for code entities by description, name, or tags",
  "inputSchema": {
    "query": { "type": "string", "description": "Search query text" },
    "type": { "type": "string", "optional": true, "description": "Entity type filter (e.g., function, class, module)" },
    "owner": { "type": "string", "optional": true, "description": "Owner/team filter" },
    "tags": { "type": "array", "items": "string", "optional": true, "description": "Tag filters" },
    "limit": { "type": "number", "optional": true, "description": "Max results (default 20)" }
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Free-text search query. Matches against entity name, description, tags, and business goal. Uses FTS5 full-text search with fallback to LIKE-based matching. |
| `type` | string | No | Filter by entity type. Common values: `function`, `class`, `module`, `service`, `interface` |
| `owner` | string | No | Filter by team/person ownership. Exact match. |
| `tags` | string[] | No | Filter by tags. All specified tags must match (AND logic). |
| `limit` | number | No | Maximum number of results. Default: 20. |

### Response Format

Returns a markdown-formatted list of matching entities. Each entity includes:

```markdown
## AuthService (service)
**File:** src/auth/service.ts:10
**Description:** Handles user authentication and session management
**Owner:** platform-team
**Status:** stable
**Language:** typescript
**Tags:** auth,security
**Business Goal:** User acquisition and retention

---

## processPayment (function)
**File:** src/payments/processor.ts:25
**Description:** Processes credit card payments via Stripe
**Owner:** payments-team
...
```

If no results match, returns: `No entities found.`

### Example Usage by AI Assistants

**User:** "What handles authentication in this codebase?"

**AI calls:**
```json
{ "query": "authentication" }
```

**User:** "Show me all payment-related functions"

**AI calls:**
```json
{ "query": "payment", "type": "function" }
```

**User:** "What does the platform team own?"

**AI calls:**
```json
{ "query": "", "owner": "platform-team" }
```

**User:** "Find all entities tagged with security"

**AI calls:**
```json
{ "query": "", "tags": ["security"] }
```

---

## find_code_by_owner

Find all code entities owned by a specific team or person. Useful for understanding team responsibilities and code ownership.

### Schema

```json
{
  "name": "find_code_by_owner",
  "description": "Find all code entities owned by a specific team or person",
  "inputSchema": {
    "owner": { "type": "string", "description": "Owner name or team to search for" }
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `owner` | string | Yes | Exact owner/team name to search for. Must match the `owner` field in annotations exactly. |

### Response Format

Same markdown entity list format as `search_code`. Returns all entities where the `owner` field matches exactly.

### Example Usage by AI Assistants

**User:** "What code does the platform team maintain?"

**AI calls:**
```json
{ "owner": "platform-team" }
```

**User:** "Show me everything owned by the payments team"

**AI calls:**
```json
{ "owner": "payments-team" }
```

---

## find_code_by_business_goal

Find code entities related to a specific business goal or context. Bridges business objectives to code ownership.

### Schema

```json
{
  "name": "find_code_by_business_goal",
  "description": "Find code entities related to a specific business goal or context",
  "inputSchema": {
    "goal": { "type": "string", "description": "Business goal or context to search for" }
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `goal` | string | Yes | Business goal text to search for. Uses LIKE matching against `business_goal` and `description` fields. Partial matches are supported. |

### Response Format

Same markdown entity list format as `search_code`.

### Example Usage by AI Assistants

**User:** "What code is related to revenue?"

**AI calls:**
```json
{ "goal": "revenue" }
```

**User:** "Find code related to user acquisition"

**AI calls:**
```json
{ "goal": "user acquisition" }
```

**User:** "What impacts our billing pipeline?"

**AI calls:**
```json
{ "goal": "billing" }
```

---

## get_code_dependencies

Get the dependency tree for a specific code entity. Traverses both incoming and outgoing dependencies up to a specified depth.

### Schema

```json
{
  "name": "get_code_dependencies",
  "description": "Get the dependency tree for a specific code entity",
  "inputSchema": {
    "entity_id": { "type": "string", "description": "The entity ID to get dependencies for" },
    "depth": { "type": "number", "optional": true, "description": "How many levels deep to traverse (default 1)" }
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entity_id` | string | Yes | The unique ID of the entity to query. Entity IDs are returned by other tools like `search_code`. |
| `depth` | number | No | How many levels deep to traverse the dependency graph. Default: 1 (direct dependencies only). Higher values follow transitive dependencies using breadth-first search. |

### Response Format

Returns a structured markdown report showing incoming and outgoing dependencies:

```markdown
## Dependencies for payment-processor

### Depends On
- auth-service (calls)
- logger-util (imports)

### Depended On By
- checkout-handler (calls)
```

If no dependencies exist: `No dependencies found for entity: <id>`

### Dependency Types

Common dependency types stored in the graph:

| Type | Description |
|------|-------------|
| `imports` | Module/file import relationship |
| `calls` | Function/method call relationship |
| `extends` | Class inheritance |
| `implements` | Interface implementation |

### Example Usage by AI Assistants

**User:** "What does the payment processor depend on?"

**AI calls:**
```json
{ "entity_id": "payment-processor" }
```

**User:** "Show me the full dependency chain for the auth service, 3 levels deep"

**AI calls:**
```json
{ "entity_id": "auth-service", "depth": 3 }
```

**User:** "What would break if I changed the logger utility?"

**AI calls:**
```json
{ "entity_id": "logger-util" }
```
(The "Depended On By" section shows what would be affected)

---

## get_entity_details

Get full metadata for a specific code entity, including external links and dependencies. This is the most comprehensive view of a single entity.

### Schema

```json
{
  "name": "get_entity_details",
  "description": "Get full metadata for a specific code entity including links and dependencies",
  "inputSchema": {
    "entity_id": { "type": "string", "description": "The entity ID to look up" }
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entity_id` | string | Yes | The unique ID of the entity. |

### Response Format

Returns comprehensive markdown with entity metadata, external links, and dependencies:

```markdown
## AuthService (service)
**File:** src/auth/service.ts:10
**Description:** Handles user authentication and session management
**Owner:** platform-team
**Status:** stable
**Language:** typescript
**Signature:** `class AuthService`
**Tags:** auth,security
**Business Goal:** User acquisition and retention
**Funnel Stage:** acquisition
**Revenue Impact:** critical

### External Links
- Auth Design Doc [notion]: https://notion.so/auth-design (entity: auth-service)
- Auth Epic [jira]: https://jira.example.com/AUTH-123 (entity: auth-service)

## Dependencies for auth-service

### Depends On
- user-model (imports)

### Depended On By
- payment-processor (calls)
```

If the entity is not found, returns an error: `Entity not found: <id>`

### Example Usage by AI Assistants

**User:** "Tell me everything about the AuthService"

**AI calls:**
```json
{ "entity_id": "auth-service" }
```

**User:** "What's the status and owner of the payment processor?"

**AI calls:**
```json
{ "entity_id": "payment-processor" }
```

---

## get_external_knowledge

Get external documentation links (Notion, Jira, Confluence, Linear, etc.) for an entity or across the entire codebase.

### Schema

```json
{
  "name": "get_external_knowledge",
  "description": "Get external links (Notion, Jira, etc.) for an entity or all entities",
  "inputSchema": {
    "entity_id": { "type": "string", "optional": true, "description": "Entity ID to get links for (omit for all)" },
    "type": { "type": "string", "optional": true, "description": "Link type filter (notion, jira, linear, etc.)" }
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entity_id` | string | No | Entity ID to get links for. If omitted, returns links for all entities. |
| `type` | string | No | Filter by link type. Common values: `notion`, `jira`, `confluence`, `linear`, `github`, `slack`. Exact match. |

### Response Format

Returns a list of links with titles, types, URLs, and associated entities:

```markdown
- Auth Design Doc [notion]: https://notion.so/auth-design (entity: auth-service)
- Auth Epic [jira]: https://jira.example.com/AUTH-123 (entity: auth-service)
- Payments Wiki [confluence]: https://confluence.example.com/payments (entity: payment-processor)
```

If no links are found: `No external links found.`

### Link Types

Links are typed based on the `type` field in `@knowgraph` annotations:

| Type | Description |
|------|-------------|
| `notion` | Notion pages and databases |
| `jira` | Jira issues and epics |
| `confluence` | Confluence wiki pages |
| `linear` | Linear issues and projects |
| `github` | GitHub issues, PRs, discussions |
| `slack` | Slack channels or threads |
| Custom | Any user-defined link type |

### Example Usage by AI Assistants

**User:** "Where's the documentation for the auth service?"

**AI calls:**
```json
{ "entity_id": "auth-service" }
```

**User:** "Show me all Notion links in the codebase"

**AI calls:**
```json
{ "type": "notion" }
```

**User:** "What Jira tickets are linked to code?"

**AI calls:**
```json
{ "type": "jira" }
```

**User:** "Show me all external documentation"

**AI calls:**
```json
{}
```

---

## get_graph_overview

Get statistics and a high-level overview of the entire indexed codebase. Takes no parameters and is often the first tool an AI assistant calls to understand the codebase.

### Schema

```json
{
  "name": "get_graph_overview",
  "description": "Get statistics and overview of the indexed codebase",
  "inputSchema": {}
}
```

### Parameters

None.

### Response Format

Returns a markdown summary of the knowledge graph:

```markdown
## KnowGraph Overview

**Total Entities:** 87
**Total Links:** 24
**Total Dependencies:** 134

### Entity Types
- function: 42
- class: 18
- module: 15
- service: 8
- interface: 4

### Owners
platform-team, payments-team, infra-team, frontend-team

### Languages
typescript, python
```

### Example Usage by AI Assistants

**User:** "Give me an overview of this codebase"

**AI calls:**
```json
{}
```

**User:** "How big is this project?"

**AI calls:**
```json
{}
```

---

## Error Handling

All tools follow a consistent error response format:

```json
{
  "content": [{ "type": "text", "text": "Error message describing the problem" }],
  "isError": true
}
```

Common error scenarios:

| Tool | Error Condition | Message |
|------|----------------|---------|
| All tools | Database query failure | `Error <action>: <error details>` |
| `get_entity_details` | Entity ID not found | `Entity not found: <id>` |
| `get_code_dependencies` | No dependencies exist | `No dependencies found for entity: <id>` |
| `get_graph_overview` | Database not initialized | `Database not available at <path>. Run 'knowgraph index' to create it.` |

## Typical AI Assistant Workflow

A typical workflow for an AI assistant exploring a codebase:

1. **Orientation:** Call `get_graph_overview` to understand the codebase size, languages, teams, and entity types
2. **Search:** Call `search_code` to find entities related to the user's question
3. **Deep Dive:** Call `get_entity_details` on specific entities to get full metadata
4. **Dependencies:** Call `get_code_dependencies` to understand how components connect
5. **Documentation:** Call `get_external_knowledge` to find related docs in Notion, Jira, etc.
6. **Team Context:** Call `find_code_by_owner` to understand team responsibilities
7. **Business Context:** Call `find_code_by_business_goal` to connect code to business objectives

### Example Conversation

**User:** "I need to understand the payment system"

**AI's internal workflow:**

```
1. get_graph_overview → Sees 87 entities, payments-team owns code
2. search_code(query: "payment") → Finds processPayment, PaymentService, etc.
3. get_entity_details(entity_id: "payment-processor") → Full metadata, links, deps
4. get_code_dependencies(entity_id: "payment-processor") → Depends on auth-service, logger-util
5. get_external_knowledge(entity_id: "payment-processor") → Finds Confluence wiki link
```

**AI's response:** "The payment system is centered around `processPayment` in `src/payments/processor.ts`, owned by the payments-team. It processes credit card payments via Stripe, depends on the auth service for validation and the logger utility for audit trails. There's a detailed wiki at [Payments Wiki](https://confluence.example.com/payments)."
