/**
 * @knowgraph
 * type: interface
 * description: Immutable types for documentation coverage calculation and reporting
 * owner: knowgraph-core
 * status: experimental
 * tags: [coverage, types, interface]
 * context:
 *   business_goal: Define data structures for measuring annotation coverage across a codebase
 *   domain: coverage-engine
 */

export interface FileCoverageInfo {
  readonly filePath: string;
  readonly language: string;
  readonly hasAnnotation: boolean;
  readonly entityCount: number;
}

export interface CoverageBreakdown {
  readonly category: string;
  readonly annotatedCount: number;
  readonly totalCount: number;
  readonly percentage: number;
}

export interface CoverageResult {
  readonly totalFiles: number;
  readonly annotatedFiles: number;
  readonly percentage: number;
  readonly byLanguage: readonly CoverageBreakdown[];
  readonly byDirectory: readonly CoverageBreakdown[];
  readonly byOwner: readonly CoverageBreakdown[];
  readonly files: readonly FileCoverageInfo[];
}

export interface CoverageOptions {
  readonly rootDir: string;
  readonly exclude?: readonly string[];
  readonly byDimension?: 'language' | 'directory' | 'owner' | 'type';
}
