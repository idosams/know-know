/**
 * @knowgraph
 * type: interface
 * description: Types for the file suggestion engine that ranks unannotated files by annotation priority
 * owner: knowgraph-core
 * status: experimental
 * tags: [suggest, types, interface]
 * context:
 *   business_goal: Define contracts for the suggestion engine output
 *   domain: suggest-engine
 */

export type SuggestionReason =
  | 'entry-point'
  | 'large-file'
  | 'many-imports'
  | 'exported-module'
  | 'uncovered';

export interface FileSuggestion {
  readonly filePath: string;
  readonly score: number;
  readonly reasons: readonly SuggestionReason[];
  readonly language: string;
  readonly lineCount: number;
}

export interface SuggestionOptions {
  readonly limit?: number;
  readonly rootDir: string;
}

export interface SuggestionResult {
  readonly suggestions: readonly FileSuggestion[];
  readonly totalUnannotated: number;
  readonly totalFiles: number;
}
