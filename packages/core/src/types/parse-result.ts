/**
 * @codegraph
 * type: interface
 * description: ParseResult interface defining the output shape of all language parsers
 * owner: codegraph-core
 * status: stable
 * tags: [parser, types, interface]
 * context:
 *   business_goal: Standardize parser output across all language implementations
 *   domain: core-types
 */
import type { CoreMetadata, EntityType, ExtendedMetadata } from './entity.js';

export interface ParseResult {
  readonly name: string;
  readonly filePath: string;
  readonly line: number;
  readonly column: number;
  readonly language: string;
  readonly entityType: EntityType;
  readonly metadata: CoreMetadata | ExtendedMetadata;
  readonly rawDocstring: string;
  readonly signature?: string;
  readonly parent?: string;
}
