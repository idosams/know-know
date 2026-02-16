// Core library exports
export * from './types/index.js';

// Parsers - re-export with explicit names to avoid conflicts
export type {
  Parser,
  ParserRegistry as ParserRegistryInterface,
} from './parsers/types.js';
export {
  extractKnowgraphYaml,
  parseAndValidateMetadata,
  extractMetadata,
} from './parsers/metadata-extractor.js';
export type {
  ExtractionError,
  ExtractionResult,
} from './parsers/metadata-extractor.js';
export { createPythonParser } from './parsers/python-parser.js';
export { createTypescriptParser } from './parsers/typescript-parser.js';
export { createGenericParser } from './parsers/generic-parser.js';
export { createDefaultRegistry } from './parsers/registry.js';

export * from './indexer/index.js';
export * from './query/index.js';
