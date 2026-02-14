import type { ParseResult } from '../types/parse-result.js';
import type { Parser } from './types.js';
import { extractMetadata } from './metadata-extractor.js';

const PYTHON_EXTENSIONS = ['.py', '.pyi'] as const;

/**
 * Regex to match Python triple-quoted docstrings.
 * Captures the quote style and the content between quotes.
 */
const DOCSTRING_REGEX = /("""[\s\S]*?"""|'''[\s\S]*?''')/g;

/**
 * Regex to match class definitions.
 */
const CLASS_DEF_REGEX = /^(\s*)class\s+(\w+)(?:\(([^)]*)\))?:/;

/**
 * Regex to match function/method definitions.
 */
const FUNC_DEF_REGEX = /^(\s*)(?:async\s+)?def\s+(\w+)\(([^)]*)\)(?:\s*->\s*([^:]+))?:/;

/**
 * Regex to match decorator lines.
 */
const DECORATOR_REGEX = /^\s*@(\S+)/;

interface DocstringMatch {
  readonly content: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly startIndex: number;
}

interface DefinitionContext {
  readonly name: string;
  readonly kind: 'module' | 'class' | 'function' | 'method';
  readonly signature?: string;
  readonly parent?: string;
  readonly line: number;
  readonly decorators: readonly string[];
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

function stripDocstringQuotes(raw: string): string {
  const quoteChar = raw[0];
  const tripleQuote = quoteChar.repeat(3);
  if (raw.startsWith(tripleQuote) && raw.endsWith(tripleQuote)) {
    return raw.slice(3, -3);
  }
  return raw;
}

function findAllDocstrings(content: string): readonly DocstringMatch[] {
  const results: DocstringMatch[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(DOCSTRING_REGEX.source, 'g');

  while ((match = regex.exec(content)) !== null) {
    const startLine = getLineNumber(content, match.index);
    const endLine = getLineNumber(content, match.index + match[0].length - 1);
    results.push({
      content: stripDocstringQuotes(match[0]),
      startLine,
      endLine,
      startIndex: match.index,
    });
  }

  return results;
}

function getLineAt(content: string, lineNumber: number): string {
  const lines = content.split('\n');
  return lines[lineNumber - 1] ?? '';
}

function collectDecorators(content: string, defLineNumber: number): readonly string[] {
  const lines = content.split('\n');
  const decorators: string[] = [];
  let lineIdx = defLineNumber - 2; // 0-indexed, line before def

  while (lineIdx >= 0) {
    const line = lines[lineIdx];
    if (line === undefined) break;
    const decoratorMatch = line.match(DECORATOR_REGEX);
    if (decoratorMatch) {
      decorators.unshift(decoratorMatch[1]);
      lineIdx--;
    } else if (line.trim() === '' || line.trim().startsWith('#')) {
      lineIdx--;
    } else {
      break;
    }
  }

  return decorators;
}

function findDefinitionBefore(
  content: string,
  docstringStartLine: number,
): DefinitionContext | null {
  const lineAbove = getLineAt(content, docstringStartLine - 1);

  // Check if it's a function/method definition
  const funcMatch = lineAbove.match(FUNC_DEF_REGEX);
  if (funcMatch) {
    const indent = funcMatch[1];
    const name = funcMatch[2];
    const params = funcMatch[3];
    const returnType = funcMatch[4]?.trim();
    const defLine = docstringStartLine - 1;
    const decorators = collectDecorators(content, defLine);

    const signatureParts = [`def ${name}(${params})`];
    if (returnType) {
      signatureParts.push(` -> ${returnType}`);
    }

    // Determine if method (has indentation and a class context)
    const isMethod = (indent?.length ?? 0) > 0;
    let parent: string | undefined;

    if (isMethod) {
      parent = findEnclosingClass(content, defLine);
    }

    return {
      name,
      kind: isMethod && parent ? 'method' : 'function',
      signature: signatureParts.join(''),
      parent,
      line: defLine,
      decorators,
    };
  }

  // Check if it's a class definition
  const classMatch = lineAbove.match(CLASS_DEF_REGEX);
  if (classMatch) {
    const name = classMatch[2];
    const defLine = docstringStartLine - 1;
    const decorators = collectDecorators(content, defLine);

    return {
      name,
      kind: 'class',
      line: defLine,
      decorators,
    };
  }

  return null;
}

function findEnclosingClass(content: string, lineNumber: number): string | undefined {
  const lines = content.split('\n');
  const targetLine = lines[lineNumber - 1];
  if (!targetLine) return undefined;

  const targetIndent = targetLine.search(/\S/);

  for (let i = lineNumber - 2; i >= 0; i--) {
    const line = lines[i];
    if (line === undefined) continue;
    const currentIndent = line.search(/\S/);
    if (currentIndent === -1) continue; // blank line

    if (currentIndent < targetIndent) {
      const classMatch = line.match(CLASS_DEF_REGEX);
      if (classMatch) {
        return classMatch[2];
      }
      // If we hit a non-class at a lower indent, stop
      break;
    }
  }

  return undefined;
}

function isModuleLevelDocstring(content: string, docstringStartLine: number): boolean {
  // A module-level docstring is at the beginning of the file,
  // possibly preceded by comments, blank lines, or shebang
  const lines = content.split('\n');
  for (let i = 0; i < docstringStartLine - 1; i++) {
    const line = lines[i]?.trim() ?? '';
    if (line === '' || line.startsWith('#') || line.startsWith('!')) {
      continue;
    }
    // Found a non-comment, non-blank line before the docstring
    return false;
  }
  return true;
}

function getModuleName(filePath: string): string {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1] ?? '';
  return fileName.replace(/\.(py|pyi)$/, '');
}

export function createPythonParser(): Parser {
  return {
    name: 'python',
    supportedExtensions: PYTHON_EXTENSIONS,

    parse(content: string, filePath: string): readonly ParseResult[] {
      const docstrings = findAllDocstrings(content);
      const results: ParseResult[] = [];

      for (const docstring of docstrings) {
        const extraction = extractMetadata(docstring.content, docstring.startLine);

        if (!extraction.metadata) {
          continue;
        }

        const metadata = extraction.metadata;

        // Determine context
        const defContext = findDefinitionBefore(content, docstring.startLine);

        if (defContext) {
          results.push({
            name: defContext.name,
            filePath,
            line: defContext.line,
            column: 1,
            language: 'python',
            entityType: metadata.type,
            metadata,
            rawDocstring: docstring.content,
            signature: defContext.signature,
            parent: defContext.parent,
          });
        } else if (isModuleLevelDocstring(content, docstring.startLine)) {
          results.push({
            name: getModuleName(filePath),
            filePath,
            line: docstring.startLine,
            column: 1,
            language: 'python',
            entityType: metadata.type,
            metadata,
            rawDocstring: docstring.content,
          });
        } else {
          // Standalone docstring not at module level - still include it
          results.push({
            name: 'unknown',
            filePath,
            line: docstring.startLine,
            column: 1,
            language: 'python',
            entityType: metadata.type,
            metadata,
            rawDocstring: docstring.content,
          });
        }
      }

      return results;
    },
  };
}
