# @knowgraph Annotation Guide

`@knowgraph` annotations are structured metadata blocks embedded in source code comments. They tell KnowGraph what a code entity is, who owns it, and how it fits into the broader system.

## Syntax

A `@knowgraph` annotation is a YAML block inside a comment. It starts with the `@knowgraph` marker, followed by YAML key-value pairs.

### TypeScript / JavaScript (JSDoc)

```typescript
/**
 * @knowgraph
 * type: module
 * description: Handles user authentication and session management
 * owner: auth-team
 * status: stable
 * tags: [auth, security, session]
 */
import { hash } from 'bcrypt';
```

The annotation goes inside a `/** ... */` JSDoc block. Each line after `@knowgraph` is a YAML key-value pair, with the leading ` * ` stripped automatically by the parser.

### Python (Docstring)

```python
"""
@knowgraph
type: module
description: Payment processing gateway integration
owner: payments-team
status: stable
tags: [payments, gateway, stripe]
"""
import stripe
```

For module-level annotations, use a triple-quoted docstring at the top of the file.

For class and function annotations, place the docstring immediately after the definition:

```python
class PaymentProcessor:
    """
    @knowgraph
    type: class
    description: Processes payments through multiple gateway providers
    owner: payments-team
    status: stable
    tags: [payments, processor]
    """

    def charge(self, amount: float, currency: str) -> dict:
        """
        @knowgraph
        type: method
        description: Charges a customer using the configured payment gateway
        owner: payments-team
        status: stable
        tags: [payments, charge]
        """
        ...
```

### Other Languages (Generic Parser)

For languages without a dedicated parser, KnowGraph uses the generic parser which supports block comments and consecutive single-line comments:

**Go:**
```go
/*
@knowgraph
type: module
description: HTTP server middleware for request logging
owner: platform-team
status: stable
tags: [middleware, logging, http]
*/
package middleware
```

**Shell / Ruby / R (hash comments):**
```bash
# @knowgraph
# type: module
# description: Database migration runner
# owner: platform-team
# status: stable
# tags: [migration, database]
```

## Fields

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | The kind of code entity |
| `description` | string | A human-readable description (minimum 1 character) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `owner` | string | Team or person responsible for this code |
| `status` | string | Lifecycle status of the entity |
| `tags` | string[] | Categorization tags for search and filtering |
| `links` | object[] | External links (Notion, Jira, GitHub, etc.) |

### Extended Fields

These are part of the `ExtendedMetadata` schema and provide richer context:

| Field | Type | Description |
|-------|------|-------------|
| `context` | object | Business context |
| `context.business_goal` | string | What business goal this code serves |
| `context.funnel_stage` | string | Marketing/product funnel stage |
| `context.revenue_impact` | string | Impact on revenue |
| `dependencies` | object | External dependencies |
| `dependencies.services` | string[] | Internal services this depends on |
| `dependencies.external_apis` | string[] | External API dependencies |
| `dependencies.databases` | string[] | Database dependencies |
| `compliance` | object | Compliance and security metadata |
| `compliance.regulations` | string[] | Applicable regulations (GDPR, SOC2, etc.) |
| `compliance.data_sensitivity` | string | Data classification level |
| `compliance.audit_requirements` | string[] | Audit requirements |
| `operational` | object | Operational metadata |
| `operational.sla` | string | SLA for this service/module |
| `operational.on_call_team` | string | On-call team |
| `operational.monitoring_dashboards` | object[] | Links to monitoring dashboards |

### Valid Values

#### `type` (EntityType)

| Value | Use For |
|-------|---------|
| `module` | Files, packages, top-level units |
| `class` | Class definitions |
| `function` | Standalone functions |
| `method` | Class methods |
| `service` | Microservices, background workers |
| `api_endpoint` | REST/GraphQL endpoints |
| `variable` | Important module-level variables |
| `constant` | Constants and configuration values |
| `interface` | TypeScript interfaces, abstract classes |
| `enum` | Enum definitions |

#### `status`

| Value | Meaning |
|-------|---------|
| `experimental` | New, may change significantly |
| `stable` | Production-ready, API is settled |
| `deprecated` | Scheduled for removal, avoid new usage |

**Important:** Never use `active` -- it is not a valid status value.

#### `context.funnel_stage`

`awareness`, `acquisition`, `activation`, `retention`, `revenue`, `referral`

#### `context.revenue_impact`

`critical`, `high`, `medium`, `low`, `none`

#### `compliance.data_sensitivity`

`public`, `internal`, `confidential`, `restricted`

#### `links[].type`

`notion`, `jira`, `linear`, `confluence`, `github`, `custom`

## Placement Rules

### TypeScript / JavaScript

1. **Module-level annotations** -- Place a JSDoc block at the top of the file, before import statements:

```typescript
/**
 * @knowgraph
 * type: module
 * description: User authentication service
 * owner: auth-team
 * status: stable
 */
import { db } from './database.js';
```

2. **Function/class annotations** -- Place a JSDoc block immediately before the declaration:

```typescript
/**
 * @knowgraph
 * type: function
 * description: Validates and hashes a user password
 * owner: auth-team
 * status: stable
 * tags: [auth, password, hashing]
 */
export function hashPassword(password: string): string {
  // ...
}
```

3. **Interface/type annotations** -- Same as functions:

```typescript
/**
 * @knowgraph
 * type: interface
 * description: Query options for searching the entity database
 * owner: knowgraph-core
 * status: stable
 */
export interface QueryOptions {
  readonly query?: string;
  readonly type?: EntityType;
}
```

### Python

1. **Module-level** -- Triple-quoted docstring at the very top (before imports):

```python
"""
@knowgraph
type: module
description: Data pipeline orchestrator
owner: data-team
status: stable
"""
import pandas as pd
```

2. **Class-level** -- Docstring immediately after the class definition:

```python
class DataPipeline:
    """
    @knowgraph
    type: class
    description: Orchestrates ETL pipelines
    owner: data-team
    status: stable
    """
```

3. **Method-level** -- Docstring immediately after the method definition:

```python
def process(self, batch_size: int = 100) -> dict:
    """
    @knowgraph
    type: method
    description: Processes a batch of records through the pipeline
    owner: data-team
    status: stable
    """
```

## Complete Examples

### Real Example from KnowGraph Source

This is the actual annotation from the metadata extractor module:

```typescript
/**
 * @knowgraph
 * type: module
 * description: Extracts and validates @knowgraph YAML metadata from comment blocks
 * owner: knowgraph-core
 * status: stable
 * tags: [parser, yaml, extraction, metadata]
 * context:
 *   business_goal: Transform raw code comments into structured, validated metadata
 *   domain: parser-engine
 */
import { parse as parseYaml } from 'yaml';
```

### Extended Metadata Example

```typescript
/**
 * @knowgraph
 * type: service
 * description: Payment processing service with Stripe integration
 * owner: payments-team
 * status: stable
 * tags: [payments, stripe, revenue]
 * links:
 *   - type: notion
 *     url: https://notion.so/payments-architecture
 *     title: Payment Architecture Doc
 *   - type: jira
 *     url: https://jira.example.com/browse/PAY-123
 * context:
 *   business_goal: Process customer payments securely
 *   funnel_stage: revenue
 *   revenue_impact: critical
 * dependencies:
 *   services: [user-service, notification-service]
 *   external_apis: [stripe-api, tax-api]
 *   databases: [payments-db]
 * compliance:
 *   regulations: [PCI-DSS, GDPR]
 *   data_sensitivity: restricted
 * operational:
 *   sla: 99.99%
 *   on_call_team: payments-oncall
 */
```

### Python with Extended Metadata

```python
"""
@knowgraph
type: module
description: ML model training pipeline
owner: ml-team
status: experimental
tags: [ml, training, pipeline]
context:
  business_goal: Train and deploy recommendation models
  funnel_stage: retention
  revenue_impact: high
dependencies:
  services: [feature-store, model-registry]
  external_apis: [aws-sagemaker]
  databases: [training-data-lake]
"""
import tensorflow as tf
```

## Best Practices

### Do

- **Annotate all production modules** -- Every file in `src/` should have a module-level annotation.
- **Use descriptive descriptions** -- At least 10 characters. Explain *what* the code does, not how.
- **Set owners** -- Every annotation should have an `owner` field for accountability.
- **Use consistent tags** -- Reuse tags across the codebase for effective search and filtering.
- **Set status appropriately** -- Use `experimental` for new code, `stable` for settled APIs, `deprecated` for sunset code.
- **Include business context** -- Use the `context.business_goal` field to connect code to business outcomes.

### Do Not

- **Do not use `active` as a status** -- Only `experimental`, `stable`, and `deprecated` are valid.
- **Do not leave empty tags** -- Either omit the `tags` field or provide meaningful values.
- **Do not skip module-level annotations** -- File-level context is the most impactful annotation.
- **Do not annotate test files** -- Tests and fixtures are typically excluded from the index.
- **Do not annotate config files** -- Build configs (eslint, vitest, tsconfig) are excluded by default.

### Anti-Patterns

```yaml
# BAD: Description is too short
type: function
description: Auth

# GOOD: Descriptive
type: function
description: Validates user credentials against the database and returns a JWT

# BAD: Invalid status
type: module
description: Something
status: active

# GOOD: Valid status
type: module
description: Something
status: stable

# BAD: Empty tags array
type: module
description: Something
tags: []

# GOOD: Either omit tags or provide values
type: module
description: Something
tags: [auth, middleware]
```

## Validation

KnowGraph includes a validation system that checks annotations for common issues.

### Built-in Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `required-fields` | error | `type` and `description` must be present |
| `valid-type` | error | `type` must be a valid EntityType value |
| `valid-status` | error | `status` must be `experimental`, `stable`, or `deprecated` |
| `non-empty-tags` | warning | `tags` should not be an empty array |
| `owner-present` | warning | `owner` should be specified |
| `description-length` | warning | Description should be at least 10 characters |

### Running Validation

```bash
# Validate all annotations in the current directory
knowgraph validate

# Validate a specific path
knowgraph validate ./packages/core/src

# Strict mode (warnings become errors)
knowgraph validate --strict

# JSON output
knowgraph validate --format json

# Run only a specific rule
knowgraph validate --rule valid-status
```

## Self-Indexing Workflow

KnowGraph indexes its own source code. After modifying annotations:

```bash
# Build the project first
pnpm turbo build

# Index the repository
node packages/cli/dist/index.js index .

# Verify the index
node packages/cli/dist/index.js query "parser"
```

The index is stored at `.knowgraph/knowgraph.db` (a SQLite database).

### Checking Coverage

```bash
# See how much of the codebase is annotated
node packages/cli/dist/index.js coverage .

# Get suggestions for which files to annotate next
node packages/cli/dist/index.js suggest .
```
