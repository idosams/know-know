/**
 * @codegraph
 * type: module
 * description: Zod schema and types for .codegraph.yml project manifest files
 * owner: codegraph-core
 * status: stable
 * tags: [schema, config, manifest, zod]
 * context:
 *   business_goal: Validate and type-check project configuration files
 *   domain: core-types
 */
import { z } from 'zod';

export const AnnotationStyleSchema = z.enum([
  'jsdoc',
  'docstring',
  'line_comment',
  'block_comment',
]);

export const ParserConfigSchema = z.object({
  enabled: z.boolean().default(true),
  extensions: z.array(z.string()).optional(),
  annotation_style: AnnotationStyleSchema.optional(),
});

export const ConnectorConfigSchema = z.object({
  enabled: z.boolean().default(false),
  api_key_env: z.string().optional(),
  workspace: z.string().optional(),
});

export const WebhookEventSchema = z.enum([
  'entity.created',
  'entity.updated',
  'entity.deleted',
  'index.complete',
]);

export const WebhookConfigSchema = z.object({
  enabled: z.boolean().default(false),
  url: z.string().url().optional(),
  events: z.array(WebhookEventSchema).optional(),
});

export const ConnectorsSchema = z.object({
  notion: ConnectorConfigSchema.optional(),
  jira: ConnectorConfigSchema.optional(),
  linear: ConnectorConfigSchema.optional(),
  webhook: WebhookConfigSchema.optional(),
});

export const IndexConfigSchema = z.object({
  output_dir: z.string().default('.codegraph'),
  incremental: z.boolean().default(true),
});

export const ManifestSchema = z.object({
  version: z.literal('1.0'),
  name: z.string().optional(),
  description: z.string().optional(),
  languages: z.array(z.string()).optional(),
  include: z.array(z.string()).default(['**/*']),
  exclude: z
    .array(z.string())
    .default(['node_modules', '.git', 'dist', 'build']),
  parsers: z.record(z.string(), ParserConfigSchema).optional(),
  connectors: ConnectorsSchema.optional(),
  index: IndexConfigSchema.optional(),
});

// Inferred TypeScript types
export type AnnotationStyle = z.infer<typeof AnnotationStyleSchema>;
export type ParserConfig = z.infer<typeof ParserConfigSchema>;
export type ConnectorConfig = z.infer<typeof ConnectorConfigSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;
export type Connectors = z.infer<typeof ConnectorsSchema>;
export type IndexConfig = z.infer<typeof IndexConfigSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
