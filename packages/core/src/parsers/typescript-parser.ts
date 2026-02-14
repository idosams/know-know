import type { ParseResult } from '../types/parse-result.js';
import type { Parser } from './types.js';
import { extractMetadata } from './metadata-extractor.js';

const TS_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'] as const;

/**
 * Regex to match JSDoc comment blocks: /** ... * /
 */
const JSDOC_REGEX = /\/\*\*[\s\S]*?\*\//g;

/**
 * Regex to match class declarations after a JSDoc block.
 */
const CLASS_DECL_REGEX =
  /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+\S+)?(?:\s+implements\s+[^{]+)?\s*\{/;

/**
 * Regex to match function declarations after a JSDoc block.
 */
const FUNC_DECL_REGEX =
  /^(?:export\s+)?(?:async\s+)?function\s+(\w+)(?:<[^>]*>)?\s*\(([^)]*)\)(?:\s*:\s*([^{;]+))?/;

/**
 * Regex to match arrow function / const assigned function.
 */
const ARROW_FUNC_REGEX =
  /^(?:export\s+)?(?:const|let|var)\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=]+)\s*=>/;

/**
 * Regex to match interface declarations.
 */
const INTERFACE_DECL_REGEX =
  /^(?:export\s+)?interface\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+[^{]+)?\s*\{/;

/**
 * Regex to match type alias declarations.
 */
const TYPE_DECL_REGEX =
  /^(?:export\s+)?type\s+(\w+)(?:<[^>]*>)?\s*=/;

/**
 * Regex to match method declarations inside a class.
 */
const METHOD_DECL_REGEX =
  /^\s+(?:(?:public|private|protected|static|async|readonly|override|abstract)\s+)*(\w+)(?:<[^>]*>)?\s*\(([^)]*)\)(?:\s*:\s*([^{;]+))?/;

/**
 * Regex to match enum declarations.
 */
const ENUM_DECL_REGEX =
  /^(?:export\s+)?(?:const\s+)?enum\s+(\w+)\s*\{/;

interface JsdocMatch {
  readonly content: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly endIndex: number;
}

function getLineNumber(source: string, charIndex: number): number {
  let line = 1;
  for (let i = 0; i < charIndex && i < source.length; i++) {
    if (source[i] === '\n') {
      line++;
    }
  }
  return line;
}

function stripJsdoc(raw: string): string {
  // Remove /** and */
  const inner = raw.slice(3, -2);
  // Remove leading * on each line
  const lines = inner.split('\n').map((line) =>
    line.replace(/^\s*\*\s?/, ''),
  );
  return lines.join('\n').trim();
}

function findAllJsdocBlocks(content: string): readonly JsdocMatch[] {
  const results: JsdocMatch[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(JSDOC_REGEX.source, 'g');

  while ((match = regex.exec(content)) !== null) {
    const startLine = getLineNumber(content, match.index);
    const endIndex = match.index + match[0].length;
    const endLine = getLineNumber(content, endIndex - 1);
    results.push({
      content: stripJsdoc(match[0]),
      startLine,
      endLine,
      endIndex,
    });
  }

  return results;
}

function getNextNonEmptyLine(content: string, afterIndex: number): string {
  const rest = content.slice(afterIndex);
  const lines = rest.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed !== '') {
      return trimmed;
    }
  }

  return '';
}

function getNextNonEmptyLineRaw(content: string, afterIndex: number): string {
  const rest = content.slice(afterIndex);
  const lines = rest.split('\n');

  for (const line of lines) {
    if (line.trim() !== '') {
      return line;
    }
  }

  return '';
}

function getNextNonEmptyLineNumber(content: string, afterIndex: number): number {
  const baseLine = getLineNumber(content, afterIndex);
  const rest = content.slice(afterIndex);
  const lines = rest.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.trim() !== '') {
      return baseLine + i;
    }
  }

  return baseLine;
}

function isModuleLevelJsdoc(content: string, startLine: number): boolean {
  const lines = content.split('\n');
  for (let i = 0; i < startLine - 1; i++) {
    const line = lines[i]?.trim() ?? '';
    if (line === '' || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
      continue;
    }
    // Check for imports/requires - those are fine before module-level jsdoc
    if (line.startsWith('import ') || line.startsWith('require(') || line.startsWith("'use strict'") || line.startsWith('"use strict"')) {
      continue;
    }
    return false;
  }
  return true;
}

function findEnclosingClassName(content: string, lineNumber: number): string | undefined {
  const lines = content.split('\n');
  const targetLine = lines[lineNumber - 1];
  if (!targetLine) return undefined;

  const targetIndent = targetLine.search(/\S/);
  if (targetIndent <= 0) return undefined;

  for (let i = lineNumber - 2; i >= 0; i--) {
    const line = lines[i];
    if (line === undefined) continue;
    const currentIndent = line.search(/\S/);
    if (currentIndent === -1) continue;

    if (currentIndent < targetIndent) {
      const trimmed = line.trim();
      const classMatch = trimmed.match(CLASS_DECL_REGEX);
      if (classMatch) {
        return classMatch[1];
      }
      break;
    }
  }

  return undefined;
}

function getModuleName(filePath: string): string {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1] ?? '';
  return fileName.replace(/\.(ts|tsx|js|jsx|mts|cts)$/, '');
}

export function createTypescriptParser(): Parser {
  return {
    name: 'typescript',
    supportedExtensions: TS_EXTENSIONS,

    parse(content: string, filePath: string): readonly ParseResult[] {
      const jsdocBlocks = findAllJsdocBlocks(content);
      const results: ParseResult[] = [];

      for (const jsdoc of jsdocBlocks) {
        const extraction = extractMetadata(jsdoc.content, jsdoc.startLine);

        if (!extraction.metadata) {
          continue;
        }

        const metadata = extraction.metadata;
        const nextLine = getNextNonEmptyLine(content, jsdoc.endIndex);
        const nextLineRaw = getNextNonEmptyLineRaw(content, jsdoc.endIndex);
        const nextLineNumber = getNextNonEmptyLineNumber(content, jsdoc.endIndex);

        // Try to match class declaration
        const classMatch = nextLine.match(CLASS_DECL_REGEX);
        if (classMatch) {
          results.push({
            name: classMatch[1],
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'typescript',
            entityType: metadata.type,
            metadata,
            rawDocstring: jsdoc.content,
          });
          continue;
        }

        // Try to match function declaration
        const funcMatch = nextLine.match(FUNC_DECL_REGEX);
        if (funcMatch) {
          const name = funcMatch[1];
          const params = funcMatch[2];
          const returnType = funcMatch[3]?.trim();
          const sigParts = [`function ${name}(${params})`];
          if (returnType) {
            sigParts.push(`: ${returnType}`);
          }

          results.push({
            name,
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'typescript',
            entityType: metadata.type,
            metadata,
            rawDocstring: jsdoc.content,
            signature: sigParts.join(''),
          });
          continue;
        }

        // Try to match arrow function
        const arrowMatch = nextLine.match(ARROW_FUNC_REGEX);
        if (arrowMatch) {
          results.push({
            name: arrowMatch[1],
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'typescript',
            entityType: metadata.type,
            metadata,
            rawDocstring: jsdoc.content,
          });
          continue;
        }

        // Try to match interface declaration
        const ifaceMatch = nextLine.match(INTERFACE_DECL_REGEX);
        if (ifaceMatch) {
          results.push({
            name: ifaceMatch[1],
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'typescript',
            entityType: metadata.type,
            metadata,
            rawDocstring: jsdoc.content,
          });
          continue;
        }

        // Try to match type alias
        const typeMatch = nextLine.match(TYPE_DECL_REGEX);
        if (typeMatch) {
          results.push({
            name: typeMatch[1],
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'typescript',
            entityType: metadata.type,
            metadata,
            rawDocstring: jsdoc.content,
          });
          continue;
        }

        // Try to match enum declaration
        const enumMatch = nextLine.match(ENUM_DECL_REGEX);
        if (enumMatch) {
          results.push({
            name: enumMatch[1],
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'typescript',
            entityType: metadata.type,
            metadata,
            rawDocstring: jsdoc.content,
          });
          continue;
        }

        // Try to match method declaration (inside a class)
        const methodMatch = nextLineRaw.match(METHOD_DECL_REGEX);
        if (methodMatch) {
          const name = methodMatch[1];
          const params = methodMatch[2];
          const returnType = methodMatch[3]?.trim();
          const parent = findEnclosingClassName(content, nextLineNumber);
          const sigParts = [`${name}(${params})`];
          if (returnType) {
            sigParts.push(`: ${returnType}`);
          }

          results.push({
            name,
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'typescript',
            entityType: metadata.type,
            metadata,
            rawDocstring: jsdoc.content,
            signature: sigParts.join(''),
            parent,
          });
          continue;
        }

        // Module-level JSDoc or unrecognized target
        if (isModuleLevelJsdoc(content, jsdoc.startLine)) {
          results.push({
            name: getModuleName(filePath),
            filePath,
            line: jsdoc.startLine,
            column: 1,
            language: 'typescript',
            entityType: metadata.type,
            metadata,
            rawDocstring: jsdoc.content,
          });
        } else {
          results.push({
            name: 'unknown',
            filePath,
            line: jsdoc.startLine,
            column: 1,
            language: 'typescript',
            entityType: metadata.type,
            metadata,
            rawDocstring: jsdoc.content,
          });
        }
      }

      return results;
    },
  };
}
