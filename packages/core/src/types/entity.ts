/**
 * @codegraph
 * type: module
 * description: Zod schemas and TypeScript types for code entities, metadata, and validation
 * owner: codegraph-core
 * status: stable
 * tags: [schema, validation, zod, types]
 * context:
 *   business_goal: Provide type-safe entity definitions for the entire CodeGraph system
 *   domain: core-types
 */
import { z } from 'zod';

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

export const StatusSchema = z.enum(['experimental', 'stable', 'deprecated']);

export const LinkTypeSchema = z.enum([
  'notion',
  'jira',
  'linear',
  'confluence',
  'github',
  'custom',
]);

export const LinkSchema = z.object({
  type: LinkTypeSchema.optional(),
  url: z.string().url(),
  title: z.string().optional(),
});

export const CoreMetadataSchema = z.object({
  type: EntityTypeSchema,
  description: z.string().min(1),
  owner: z.string().optional(),
  status: StatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  links: z.array(LinkSchema).optional(),
});

export const FunnelStageSchema = z.enum([
  'awareness',
  'acquisition',
  'activation',
  'retention',
  'revenue',
  'referral',
]);

export const RevenueImpactSchema = z.enum([
  'critical',
  'high',
  'medium',
  'low',
  'none',
]);

export const ContextSchema = z.object({
  business_goal: z.string().optional(),
  funnel_stage: FunnelStageSchema.optional(),
  revenue_impact: RevenueImpactSchema.optional(),
});

export const DependenciesSchema = z.object({
  services: z.array(z.string()).optional(),
  external_apis: z.array(z.string()).optional(),
  databases: z.array(z.string()).optional(),
});

export const DataSensitivitySchema = z.enum([
  'public',
  'internal',
  'confidential',
  'restricted',
]);

export const ComplianceSchema = z.object({
  regulations: z.array(z.string()).optional(),
  data_sensitivity: DataSensitivitySchema.optional(),
  audit_requirements: z.array(z.string()).optional(),
});

export const MonitoringDashboardSchema = z.object({
  type: z.string().optional(),
  url: z.string().url(),
  title: z.string().optional(),
});

export const OperationalSchema = z.object({
  sla: z.string().optional(),
  on_call_team: z.string().optional(),
  monitoring_dashboards: z.array(MonitoringDashboardSchema).optional(),
});

export const ExtendedMetadataSchema = CoreMetadataSchema.extend({
  context: ContextSchema.optional(),
  dependencies: DependenciesSchema.optional(),
  compliance: ComplianceSchema.optional(),
  operational: OperationalSchema.optional(),
});

// Inferred TypeScript types
export type EntityType = z.infer<typeof EntityTypeSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type LinkType = z.infer<typeof LinkTypeSchema>;
export type Link = z.infer<typeof LinkSchema>;
export type CoreMetadata = z.infer<typeof CoreMetadataSchema>;
export type FunnelStage = z.infer<typeof FunnelStageSchema>;
export type RevenueImpact = z.infer<typeof RevenueImpactSchema>;
export type Context = z.infer<typeof ContextSchema>;
export type Dependencies = z.infer<typeof DependenciesSchema>;
export type DataSensitivity = z.infer<typeof DataSensitivitySchema>;
export type Compliance = z.infer<typeof ComplianceSchema>;
export type MonitoringDashboard = z.infer<typeof MonitoringDashboardSchema>;
export type Operational = z.infer<typeof OperationalSchema>;
export type ExtendedMetadata = z.infer<typeof ExtendedMetadataSchema>;
