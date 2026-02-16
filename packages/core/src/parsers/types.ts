/**
 * @knowgraph
 * type: interface
 * description: Parser and ParserRegistry interfaces for the language parser system
 * owner: knowgraph-core
 * status: stable
 * tags: [parser, types, interface, registry]
 * context:
 *   business_goal: Define contracts for pluggable language parser implementations
 *   domain: parser-engine
 */
import type { ParseResult } from '../types/parse-result.js';

export interface Parser {
  readonly name: string;
  readonly supportedExtensions: readonly string[];
  parse(content: string, filePath: string): readonly ParseResult[];
}

export interface ParserRegistry {
  register(parser: Parser): void;
  getParser(filePath: string): Parser | undefined;
  parseFile(content: string, filePath: string): readonly ParseResult[];
}
