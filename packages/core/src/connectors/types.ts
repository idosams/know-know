/**
 * @knowgraph
 * type: interface
 * description: Type definitions and Zod schemas for the connector plugin system
 * owner: knowgraph-core
 * status: experimental
 * tags: [connector, types, interface, zod]
 * context:
 *   business_goal: Define contracts for external knowledge connectors
 *   domain: connectors
 */
import { z } from 'zod';
import type { DatabaseManager } from '../indexer/database.js';
import type { LinkType } from '../types/entity.js';
import type { ConnectorConfig } from '../types/manifest.js';

// --- Zod Schemas ---

export const ConnectorValidationIssueSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export const ConnectorValidationResultSchema = z.object({
  valid: z.boolean(),
  issues: z.array(ConnectorValidationIssueSchema),
});

export const ConnectorErrorSchema = z.object({
  entityId: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

export const ConnectorSyncResultSchema = z.object({
  connector: z.string(),
  entitiesProcessed: z.number(),
  linksAdded: z.number(),
  linksUpdated: z.number(),
  errors: z.array(ConnectorErrorSchema),
  duration: z.number(),
});

// --- Inferred TypeScript Types ---

export type ConnectorValidationIssue = z.infer<
  typeof ConnectorValidationIssueSchema
>;
export type ConnectorValidationResult = z.infer<
  typeof ConnectorValidationResultSchema
>;
export type ConnectorError = z.infer<typeof ConnectorErrorSchema>;
export type ConnectorSyncResult = z.infer<typeof ConnectorSyncResultSchema>;

// --- Re-export ConnectorConfig from manifest types ---

export type { ConnectorConfig } from '../types/manifest.js';

// --- Interfaces ---

export interface ConnectorSyncOptions {
  readonly dbManager: DatabaseManager;
  readonly config: ConnectorConfig;
  readonly entityFilter?: {
    readonly owner?: string;
    readonly tags?: readonly string[];
  };
  readonly dryRun: boolean;
}

export interface Connector {
  readonly name: string;
  readonly supportedLinkTypes: readonly LinkType[];
  validate(config: ConnectorConfig): ConnectorValidationResult;
  sync(options: ConnectorSyncOptions): Promise<ConnectorSyncResult>;
}

export interface SyncAllOptions {
  readonly dbManager: DatabaseManager;
  readonly configs: Readonly<Record<string, ConnectorConfig>>;
  readonly entityFilter?: {
    readonly owner?: string;
    readonly tags?: readonly string[];
  };
  readonly dryRun: boolean;
  readonly onProgress?: (
    connectorName: string,
    result: ConnectorSyncResult,
  ) => void;
}

export interface ConnectorRegistry {
  register(connector: Connector): void;
  getConnector(name: string): Connector | undefined;
  listConnectors(): readonly string[];
  syncAll(options: SyncAllOptions): Promise<readonly ConnectorSyncResult[]>;
}
