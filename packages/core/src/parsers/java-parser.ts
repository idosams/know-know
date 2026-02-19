/**
 * @knowgraph
 * type: module
 * description: Java language parser that extracts @knowgraph annotations from JavaDoc comments
 * owner: knowgraph-core
 * status: experimental
 * tags: [parser, java, javadoc]
 * context:
 *   business_goal: Enable Java codebases to be indexed by KnowGraph
 *   domain: parser-engine
 */
import type { ParseResult } from '../types/parse-result.js';
import type { Parser } from './types.js';
import { extractMetadata } from './metadata-extractor.js';

const JAVA_EXTENSIONS = ['.java'] as const;

/**
 * Regex to match JavaDoc comment blocks: /** ... * /
 */
const JAVADOC_REGEX = /\/\*\*[\s\S]*?\*\//g;

/**
 * Regex to match class or record declarations.
 */
const JAVA_CLASS_REGEX =
  /^(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?(?:abstract\s+)?(?:class|record)\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+\S+)?(?:\s+implements\s+[^{]+)?\s*[({]/;

/**
 * Regex to match interface declarations.
 */
const JAVA_INTERFACE_REGEX =
  /^(?:public|private|protected)?\s*(?:static\s+)?interface\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+[^{]+)?\s*\{/;

/**
 * Regex to match enum declarations.
 */
const JAVA_ENUM_REGEX =
  /^(?:public|private|protected)?\s*(?:static\s+)?enum\s+(\w+)(?:\s+implements\s+[^{]+)?\s*\{/;

/**
 * Regex to match method declarations inside a class.
 */
const JAVA_METHOD_REGEX =
  /^\s+(?:(?:public|private|protected|static|final|abstract|synchronized|native|default)\s+)*(?:<[^>]*>\s+)?(\w+(?:<[^>]*>)?(?:\[\])*)\s+(\w+)\s*\(([^)]*)\)/;

/**
 * Regex to match Java annotations (e.g., @Override, @PostMapping("/api")).
 */
const JAVA_ANNOTATION_REGEX = /^\s*@\w+/;

/**
 * Regex to match package declarations.
 */
const JAVA_PACKAGE_REGEX = /^package\s+([\w.]+)\s*;/;

interface JavadocMatch {
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

function stripJavadoc(raw: string): string {
  // Remove /** and */
  const inner = raw.slice(3, -2);
  // Remove leading * on each line
  const lines = inner.split('\n').map((line) => line.replace(/^\s*\*\s?/, ''));
  return lines.join('\n').trim();
}

function findAllJavadocBlocks(content: string): readonly JavadocMatch[] {
  const results: JavadocMatch[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(JAVADOC_REGEX.source, 'g');

  while ((match = regex.exec(content)) !== null) {
    const startLine = getLineNumber(content, match.index);
    const endIndex = match.index + match[0].length;
    const endLine = getLineNumber(content, endIndex - 1);
    results.push({
      content: stripJavadoc(match[0]),
      startLine,
      endLine,
      endIndex,
    });
  }

  return results;
}

/**
 * Get the next non-empty line after the given character index,
 * skipping Java annotations (@Override, @PostMapping, etc.).
 * Returns the trimmed line content.
 */
function getNextCodeLine(content: string, afterIndex: number): string {
  const rest = content.slice(afterIndex);
  const lines = rest.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    if (JAVA_ANNOTATION_REGEX.test(trimmed)) continue;
    return trimmed;
  }

  return '';
}

/**
 * Get the next non-empty line after the given character index,
 * skipping Java annotations. Returns the raw (unstripped) line.
 */
function getNextCodeLineRaw(content: string, afterIndex: number): string {
  const rest = content.slice(afterIndex);
  const lines = rest.split('\n');

  for (const line of lines) {
    if (line.trim() === '') continue;
    if (JAVA_ANNOTATION_REGEX.test(line.trim())) continue;
    return line;
  }

  return '';
}

/**
 * Get the line number of the next non-empty, non-annotation line
 * after the given character index.
 */
function getNextCodeLineNumber(content: string, afterIndex: number): number {
  const baseLine = getLineNumber(content, afterIndex);
  const rest = content.slice(afterIndex);
  const lines = rest.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]?.trim() ?? '';
    if (trimmed === '') continue;
    if (JAVA_ANNOTATION_REGEX.test(trimmed)) continue;
    return baseLine + i;
  }

  return baseLine;
}

/**
 * Get the next non-empty line (without skipping annotations).
 * Used for checking package declarations.
 */
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

function isModuleLevelJavadoc(content: string, startLine: number): boolean {
  const lines = content.split('\n');
  for (let i = 0; i < startLine - 1; i++) {
    const line = lines[i]?.trim() ?? '';
    if (
      line === '' ||
      line.startsWith('//') ||
      line.startsWith('/*') ||
      line.startsWith('*')
    ) {
      continue;
    }
    // Check for package/import declarations - those are fine before module-level javadoc
    if (line.startsWith('package ') || line.startsWith('import ')) {
      continue;
    }
    return false;
  }
  return true;
}

function findEnclosingClassName(
  content: string,
  lineNumber: number,
): string | undefined {
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
      const classMatch = trimmed.match(JAVA_CLASS_REGEX);
      if (classMatch) {
        return classMatch[1];
      }
      const ifaceMatch = trimmed.match(JAVA_INTERFACE_REGEX);
      if (ifaceMatch) {
        return ifaceMatch[1];
      }
      break;
    }
  }

  return undefined;
}

function getModuleName(filePath: string): string {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1] ?? '';
  return fileName.replace(/\.java$/, '');
}

/**
 * Build a method signature from a raw line match.
 * Extracts modifiers, return type, name, and parameters.
 */
function buildMethodSignature(rawLine: string): string {
  const trimmed = rawLine.trim();
  // Remove opening brace if present
  const withoutBrace = trimmed.replace(/\s*\{.*$/, '');
  return withoutBrace;
}

export function createJavaParser(): Parser {
  return {
    name: 'java',
    supportedExtensions: JAVA_EXTENSIONS,

    parse(content: string, filePath: string): readonly ParseResult[] {
      const javadocBlocks = findAllJavadocBlocks(content);
      const results: ParseResult[] = [];

      for (const javadoc of javadocBlocks) {
        const extraction = extractMetadata(javadoc.content, javadoc.startLine);

        if (!extraction.metadata) {
          continue;
        }

        const metadata = extraction.metadata;
        const nextLine = getNextCodeLine(content, javadoc.endIndex);
        const nextLineRaw = getNextCodeLineRaw(content, javadoc.endIndex);
        const nextLineNumber = getNextCodeLineNumber(
          content,
          javadoc.endIndex,
        );

        // Try to match class or record declaration
        const classMatch = nextLine.match(JAVA_CLASS_REGEX);
        if (classMatch) {
          results.push({
            name: classMatch[1],
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'java',
            entityType: metadata.type,
            metadata,
            rawDocstring: javadoc.content,
          });
          continue;
        }

        // Try to match interface declaration
        const ifaceMatch = nextLine.match(JAVA_INTERFACE_REGEX);
        if (ifaceMatch) {
          results.push({
            name: ifaceMatch[1],
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'java',
            entityType: metadata.type,
            metadata,
            rawDocstring: javadoc.content,
          });
          continue;
        }

        // Try to match enum declaration
        const enumMatch = nextLine.match(JAVA_ENUM_REGEX);
        if (enumMatch) {
          results.push({
            name: enumMatch[1],
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'java',
            entityType: metadata.type,
            metadata,
            rawDocstring: javadoc.content,
          });
          continue;
        }

        // Try to match method declaration (inside a class)
        const methodMatch = nextLineRaw.match(JAVA_METHOD_REGEX);
        if (methodMatch) {
          const name = methodMatch[2];
          const parent = findEnclosingClassName(content, nextLineNumber);
          const signature = buildMethodSignature(nextLineRaw);

          results.push({
            name,
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'java',
            entityType: metadata.type,
            metadata,
            rawDocstring: javadoc.content,
            signature,
            parent,
          });
          continue;
        }

        // Check for package declaration (module-level)
        const nextNonEmpty = getNextNonEmptyLine(content, javadoc.endIndex);
        const packageMatch = nextNonEmpty.match(JAVA_PACKAGE_REGEX);
        if (packageMatch && isModuleLevelJavadoc(content, javadoc.startLine)) {
          results.push({
            name: packageMatch[1],
            filePath,
            line: javadoc.startLine,
            column: 1,
            language: 'java',
            entityType: metadata.type,
            metadata,
            rawDocstring: javadoc.content,
          });
          continue;
        }

        // Module-level JavaDoc or unrecognized target
        if (isModuleLevelJavadoc(content, javadoc.startLine)) {
          results.push({
            name: getModuleName(filePath),
            filePath,
            line: javadoc.startLine,
            column: 1,
            language: 'java',
            entityType: metadata.type,
            metadata,
            rawDocstring: javadoc.content,
          });
        } else {
          results.push({
            name: 'unknown',
            filePath,
            line: javadoc.startLine,
            column: 1,
            language: 'java',
            entityType: metadata.type,
            metadata,
            rawDocstring: javadoc.content,
          });
        }
      }

      return results;
    },
  };
}
