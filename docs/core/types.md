# Type System

The KnowGraph type system is built on [Zod](https://zod.dev/) schemas, which serve as the single source of truth for both runtime validation and TypeScript type inference. All types are defined in `packages/core/src/types/`.

## Architecture

```
types/
  entity.ts        # Entity and metadata schemas
  manifest.ts      # Project manifest schema (.knowgraph.yml)
  parse-result.ts  # Parser output interface
  index.ts         # Re-exports
```

Types flow through the system in this order:

```
Raw YAML  -->  Zod validation  -->  Inferred TypeScript types  -->  SQLite storage
```

## Entity Types

### EntityTypeSchema

Defines the valid kinds of code entities that can be annotated.

```typescript
export const EntityTypeSchema = z.enum([
  'module',
  'class',
  'function',
  'method',
  'service',
  'api_endpoint',
  'variable',
  'constant',
  'interface',
  'enum',
]);

type EntityType = z.infer<typeof EntityTypeSchema>;
```

| Value | Description |
|-------|-------------|
| `module` | A file-level or package-level module |
| `class` | A class definition |
| `function` | A standalone function |
| `method` | A method inside a class |
| `service` | A service (microservice, background worker) |
| `api_endpoint` | An API route or endpoint handler |
| `variable` | A variable binding |
| `constant` | A constant value |
| `interface` | A TypeScript interface or type alias |
| `enum` | An enumeration type |

### StatusSchema

Allowed lifecycle statuses for annotated entities. Only three values are valid -- `active` is explicitly **not** accepted.

```typescript
export const StatusSchema = z.enum(['experimental', 'stable', 'deprecated']);

type Status = z.infer<typeof StatusSchema>;
```

### LinkSchema

References to external documentation or tracking systems.

```typescript
export const LinkTypeSchema = z.enum([
  'notion', 'jira', 'linear', 'confluence', 'github', 'custom',
]);

export const LinkSchema = z.object({
  type: LinkTypeSchema.optional(),
  url: z.string().url(),       // Required, must be a valid URL
  title: z.string().optional(),
});

type Link = z.infer<typeof LinkSchema>;
```

## Core Metadata

The minimum metadata required for any `@knowgraph` annotation.

```typescript
export const CoreMetadataSchema = z.object({
  type: EntityTypeSchema,              // Required
  description: z.string().min(1),      // Required, non-empty
  owner: z.string().optional(),
  status: StatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  links: z.array(LinkSchema).optional(),
});

type CoreMetadata = z.infer<typeof CoreMetadataSchema>;
```

**Required fields**: `type` and `description`.

**Optional fields**: `owner`, `status`, `tags`, `links`.

## Extended Metadata

Extends `CoreMetadata` with business context, dependency tracking, compliance, and operational information. The extended schema is a superset -- any valid `CoreMetadata` object also passes `ExtendedMetadata` validation.

### Context

```typescript
export const FunnelStageSchema = z.enum([
  'awareness', 'acquisition', 'activation',
  'retention', 'revenue', 'referral',
]);

export const RevenueImpactSchema = z.enum([
  'critical', 'high', 'medium', 'low', 'none',
]);

export const ContextSchema = z.object({
  business_goal: z.string().optional(),
  funnel_stage: FunnelStageSchema.optional(),
  revenue_impact: RevenueImpactSchema.optional(),
});
```

### Dependencies

```typescript
export const DependenciesSchema = z.object({
  services: z.array(z.string()).optional(),
  external_apis: z.array(z.string()).optional(),
  databases: z.array(z.string()).optional(),
});
```

### Compliance

```typescript
export const DataSensitivitySchema = z.enum([
  'public', 'internal', 'confidential', 'restricted',
]);

export const ComplianceSchema = z.object({
  regulations: z.array(z.string()).optional(),
  data_sensitivity: DataSensitivitySchema.optional(),
  audit_requirements: z.array(z.string()).optional(),
});
```

### Operational

```typescript
export const MonitoringDashboardSchema = z.object({
  type: z.string().optional(),
  url: z.string().url(),       // Required, must be a valid URL
  title: z.string().optional(),
});

export const OperationalSchema = z.object({
  sla: z.string().optional(),
  on_call_team: z.string().optional(),
  monitoring_dashboards: z.array(MonitoringDashboardSchema).optional(),
});
```

### Full Extended Schema

```typescript
export const ExtendedMetadataSchema = CoreMetadataSchema.extend({
  context: ContextSchema.optional(),
  dependencies: DependenciesSchema.optional(),
  compliance: ComplianceSchema.optional(),
  operational: OperationalSchema.optional(),
});

type ExtendedMetadata = z.infer<typeof ExtendedMetadataSchema>;
```

## ParseResult Interface

The standard output shape for all language parsers. Every parser must produce `ParseResult` objects.

```typescript
export interface ParseResult {
  readonly name: string;           // Entity name (function name, class name, module name)
  readonly filePath: string;       // Path to the source file
  readonly line: number;           // Line number of the entity declaration
  readonly column: number;         // Column number
  readonly language: string;       // Language identifier (typescript, python, etc.)
  readonly entityType: EntityType; // From metadata
  readonly metadata: CoreMetadata | ExtendedMetadata;
  readonly rawDocstring: string;   // The original comment block text
  readonly signature?: string;     // Function/method signature (if applicable)
  readonly parent?: string;        // Enclosing class name (for methods)
}
```

All fields are `readonly` to enforce immutability.

## Manifest Schema

Defines the shape of `.knowgraph.yml` project configuration files.

```typescript
export const ManifestSchema = z.object({
  version: z.literal('1.0'),                          // Only "1.0" accepted
  name: z.string().optional(),
  description: z.string().optional(),
  languages: z.array(z.string()).optional(),
  include: z.array(z.string()).default(['**/*']),
  exclude: z.array(z.string()).default(['node_modules', '.git', 'dist', 'build']),
  parsers: z.record(z.string(), ParserConfigSchema).optional(),
  connectors: ConnectorsSchema.optional(),
  index: IndexConfigSchema.optional(),
});
```

### Defaults

| Field | Default |
|-------|---------|
| `include` | `['**/*']` |
| `exclude` | `['node_modules', '.git', 'dist', 'build']` |
| `index.output_dir` | `'.knowgraph'` |
| `index.incremental` | `true` |
| `parsers.*.enabled` | `true` |
| `connectors.*.enabled` | `false` |

### Supporting Schemas

```typescript
export const AnnotationStyleSchema = z.enum([
  'jsdoc', 'docstring', 'line_comment', 'block_comment',
]);

export const ParserConfigSchema = z.object({
  enabled: z.boolean().default(true),
  extensions: z.array(z.string()).optional(),
  annotation_style: AnnotationStyleSchema.optional(),
});

export const WebhookEventSchema = z.enum([
  'entity.created', 'entity.updated', 'entity.deleted', 'index.complete',
]);

export const WebhookConfigSchema = z.object({
  enabled: z.boolean().default(false),
  url: z.string().url().optional(),
  events: z.array(WebhookEventSchema).optional(),
});

export const ConnectorConfigSchema = z.object({
  enabled: z.boolean().default(false),
  api_key_env: z.string().optional(),
  workspace: z.string().optional(),
});

export const ConnectorsSchema = z.object({
  notion: ConnectorConfigSchema.optional(),
  jira: ConnectorConfigSchema.optional(),
  linear: ConnectorConfigSchema.optional(),
  webhook: WebhookConfigSchema.optional(),
});

export const IndexConfigSchema = z.object({
  output_dir: z.string().default('.knowgraph'),
  incremental: z.boolean().default(true),
});
```

## Type Inference Pattern

All TypeScript types are inferred from Zod schemas using `z.infer<>`, ensuring runtime validation and compile-time types stay in sync:

```typescript
// Schema is the source of truth
export const CoreMetadataSchema = z.object({ ... });

// TypeScript type is derived, not manually defined
export type CoreMetadata = z.infer<typeof CoreMetadataSchema>;
```

This pattern eliminates type drift -- if you change the schema, the type updates automatically.

## Schema Validation Strategy

During metadata extraction, the system uses a fallback approach:

1. Try `ExtendedMetadataSchema.safeParse(parsed)` first (superset)
2. If that fails, try `CoreMetadataSchema.safeParse(parsed)`
3. If both fail, return validation errors from the extended schema (more informative)

This allows simple annotations with just `type` and `description` to pass core validation, while extended annotations with `context`, `dependencies`, etc. get full validation.

## Exports

All types and schemas are re-exported from `@knowgraph/core`:

```typescript
import {
  // Schemas
  EntityTypeSchema, StatusSchema, LinkSchema,
  CoreMetadataSchema, ExtendedMetadataSchema,
  ManifestSchema,
  // Types
  type EntityType, type Status, type Link,
  type CoreMetadata, type ExtendedMetadata,
  type ParseResult, type Manifest,
} from '@knowgraph/core';
```

Source files:
- `packages/core/src/types/entity.ts`
- `packages/core/src/types/manifest.ts`
- `packages/core/src/types/parse-result.ts`
