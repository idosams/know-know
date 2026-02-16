/**
 * @knowgraph
 * type: interface
 * description: Type definitions for stored entities, index operations, and progress tracking
 * owner: knowgraph-core
 * status: stable
 * tags: [indexer, types, interface, storage]
 * context:
 *   business_goal: Define contracts for the indexing and storage layer
 *   domain: indexer-engine
 */
import type {
  CoreMetadata,
  EntityType,
  ExtendedMetadata,
  Link,
  Status,
} from '../types/index.js';

export interface StoredEntity {
  readonly id: string;
  readonly filePath: string;
  readonly name: string;
  readonly entityType: EntityType;
  readonly description: string;
  readonly rawDocstring: string | null;
  readonly signature: string | null;
  readonly parent: string | null;
  readonly language: string;
  readonly line: number;
  readonly column: number;
  readonly owner: string | null;
  readonly status: Status | null;
  readonly metadata: CoreMetadata | ExtendedMetadata;
  readonly tags: readonly string[];
  readonly links: readonly Link[];
  readonly fileHash: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EntityInsert {
  readonly filePath: string;
  readonly name: string;
  readonly entityType: EntityType;
  readonly description: string;
  readonly rawDocstring?: string;
  readonly signature?: string;
  readonly parent?: string;
  readonly language: string;
  readonly line: number;
  readonly column: number;
  readonly owner?: string;
  readonly status?: Status;
  readonly metadata: CoreMetadata | ExtendedMetadata;
  readonly tags?: readonly string[];
  readonly links?: readonly Link[];
  readonly fileHash?: string;
}

export interface IndexStats {
  readonly totalEntities: number;
  readonly totalRelationships: number;
  readonly totalTags: number;
  readonly totalLinks: number;
  readonly entitiesByType: Readonly<Record<string, number>>;
  readonly entitiesByLanguage: Readonly<Record<string, number>>;
}

export interface IndexerOptions {
  readonly rootDir: string;
  readonly outputDir?: string;
  readonly exclude?: readonly string[];
  readonly incremental?: boolean;
  readonly onProgress?: (progress: IndexProgress) => void;
}

export interface IndexProgress {
  readonly totalFiles: number;
  readonly processedFiles: number;
  readonly currentFile: string;
  readonly entitiesFound: number;
}

export interface IndexResult {
  readonly totalFiles: number;
  readonly totalEntities: number;
  readonly totalRelationships: number;
  readonly errors: readonly IndexError[];
  readonly duration: number;
}

export interface IndexError {
  readonly filePath: string;
  readonly message: string;
  readonly error?: unknown;
}
