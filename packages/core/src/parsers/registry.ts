/**
 * @knowgraph
 * type: module
 * description: Parser registry that routes files to appropriate language parsers by extension
 * owner: knowgraph-core
 * status: stable
 * tags: [parser, registry, factory, routing]
 * context:
 *   business_goal: Enable automatic parser selection based on file type
 *   domain: parser-engine
 */
import type { ParseResult } from '../types/parse-result.js';
import type { Parser, ParserRegistry } from './types.js';
import { createPythonParser } from './python-parser.js';
import { createTypescriptParser } from './typescript-parser.js';
import { createGenericParser } from './generic-parser.js';

function getExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filePath.slice(lastDot);
}

function createRegistry(): ParserRegistry {
  const parsers: Parser[] = [];
  const genericParser = createGenericParser();

  return {
    register(parser: Parser): void {
      parsers.push(parser);
    },

    getParser(filePath: string): Parser | undefined {
      const ext = getExtension(filePath);
      const specific = parsers.find((p) => p.supportedExtensions.includes(ext));
      return specific ?? genericParser;
    },

    parseFile(content: string, filePath: string): readonly ParseResult[] {
      const parser = this.getParser(filePath);
      if (!parser) {
        return [];
      }
      return parser.parse(content, filePath);
    },
  };
}

export function createDefaultRegistry(): ParserRegistry {
  const registry = createRegistry();
  registry.register(createPythonParser());
  registry.register(createTypescriptParser());
  return registry;
}
