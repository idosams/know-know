/**
 * @knowgraph
 * type: module
 * description: Go language parser that extracts @knowgraph annotations from line and block comments
 * owner: knowgraph-core
 * status: experimental
 * tags: [parser, go, comments]
 * context:
 *   business_goal: Enable Go codebases to be indexed by KnowGraph
 *   domain: parser-engine
 */
import type { ParseResult } from '../types/parse-result.js';
import type { Parser } from './types.js';
import { extractMetadata } from './metadata-extractor.js';

const GO_EXTENSIONS = ['.go'] as const;

/**
 * Regex to match Go block comments: /* ... * /
 */
const BLOCK_COMMENT_REGEX = /\/\*[\s\S]*?\*\//g;

/**
 * Regex to match Go function declarations, including methods with receivers.
 * Groups: (1) receiver name, (2) receiver type, (3) function name,
 *         (4) parameters, (5) return type(s)
 */
const GO_FUNC_REGEX =
  /^func\s+(?:\((\w+)\s+\*?(\w+)\)\s+)?(\w+)\s*\((.*?)\)(?:\s+([^{]+?))?(?:\s*\{|$)/;

/**
 * Regex to match Go struct type declarations.
 */
const GO_STRUCT_REGEX = /^type\s+(\w+)\s+struct\s*\{/;

/**
 * Regex to match Go interface type declarations.
 */
const GO_INTERFACE_REGEX = /^type\s+(\w+)\s+interface\s*\{/;

/**
 * Regex to match Go single const declarations.
 */
const GO_CONST_REGEX = /^const\s+(\w+)/;

/**
 * Regex to match Go const group opening.
 */
const GO_CONST_GROUP_REGEX = /^const\s*\(/;

/**
 * Regex to match Go single var declarations.
 */
const GO_VAR_REGEX = /^var\s+(\w+)/;

/**
 * Regex to match Go var group opening.
 */
const GO_VAR_GROUP_REGEX = /^var\s*\(/;

/**
 * Regex to match Go package declarations.
 */
const GO_PACKAGE_REGEX = /^package\s+(\w+)/;

interface CommentMatch {
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

/**
 * Strip block comment delimiters and leading asterisks from a Go block comment.
 */
function stripBlockComment(raw: string): string {
  // Remove /* and */
  const inner = raw.slice(2, -2);
  // Remove leading * on each line (similar to JSDoc)
  const lines = inner.split('\n').map((line) => line.replace(/^\s*\*\s?/, ''));
  return lines.join('\n').trim();
}

/**
 * Strip // prefix and optional space from a line comment.
 */
function stripLineCommentPrefix(line: string): string {
  return line.replace(/^\s*\/\/\s?/, '');
}

/**
 * Find all block comments in the source content.
 */
function findBlockComments(content: string): readonly CommentMatch[] {
  const results: CommentMatch[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(BLOCK_COMMENT_REGEX.source, 'g');

  while ((match = regex.exec(content)) !== null) {
    const startLine = getLineNumber(content, match.index);
    const endIndex = match.index + match[0].length;
    const endLine = getLineNumber(content, endIndex - 1);
    results.push({
      content: stripBlockComment(match[0]),
      startLine,
      endLine,
      endIndex,
    });
  }

  return results;
}

/**
 * Find all groups of consecutive // line comments in the source content.
 * A group is a set of consecutive lines where each line (trimmed) starts with //.
 */
function findLineCommentGroups(content: string): readonly CommentMatch[] {
  const lines = content.split('\n');
  const results: CommentMatch[] = [];
  let groupStartLine = -1;
  let groupLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const trimmed = line.trim();

    if (trimmed.startsWith('//')) {
      if (groupStartLine === -1) {
        groupStartLine = i + 1; // 1-based
      }
      groupLines.push(stripLineCommentPrefix(line));
    } else {
      if (groupLines.length > 0) {
        const strippedContent = groupLines.join('\n').trim();
        const endLine = groupStartLine + groupLines.length - 1;
        // Calculate the character index after the last line of the group
        const endIndex = computeEndIndex(content, endLine);
        results.push({
          content: strippedContent,
          startLine: groupStartLine,
          endLine,
          endIndex,
        });
      }
      groupStartLine = -1;
      groupLines = [];
    }
  }

  // Handle trailing group at end of file
  if (groupLines.length > 0) {
    const strippedContent = groupLines.join('\n').trim();
    const endLine = groupStartLine + groupLines.length - 1;
    const endIndex = computeEndIndex(content, endLine);
    results.push({
      content: strippedContent,
      startLine: groupStartLine,
      endLine,
      endIndex,
    });
  }

  return results;
}

/**
 * Compute the character index pointing to just after the end of a given line number (1-based).
 */
function computeEndIndex(content: string, lineNumber: number): number {
  const lines = content.split('\n');
  let index = 0;
  for (let i = 0; i < lineNumber && i < lines.length; i++) {
    index += (lines[i]?.length ?? 0) + 1; // +1 for newline
  }
  return index;
}

/**
 * Get the next non-empty line (trimmed) after a character index.
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

/**
 * Get the line number of the next non-empty line after a character index.
 */
function getNextNonEmptyLineNumber(
  content: string,
  afterIndex: number,
): number {
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

/**
 * Check if a comment block is at the top of the file (module-level).
 * Only blank lines and comments are allowed before it.
 */
function isModuleLevelComment(content: string, startLine: number): boolean {
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
    return false;
  }
  return true;
}

/**
 * Extract module name from file path by removing the .go extension.
 */
function getModuleName(filePath: string): string {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1] ?? '';
  return fileName.replace(/\.go$/, '');
}

/**
 * Extract the first identifier name from lines following a group opening (const/var block).
 * Looks at lines after the given character index for the first word character sequence.
 */
function extractFirstGroupIdentifier(
  content: string,
  afterIndex: number,
): string | undefined {
  const rest = content.slice(afterIndex);
  const lines = rest.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed === '(' || trimmed === ')') {
      continue;
    }
    const identMatch = trimmed.match(/^(\w+)/);
    if (identMatch) {
      return identMatch[1];
    }
  }

  return undefined;
}

/**
 * Get the character index of the end of a specific non-empty line after a given position.
 * Used to advance past the group opening line (e.g., `const (`) to find
 * the line number of the first identifier inside the block.
 */
function getEndIndexOfNextNonEmptyLine(
  content: string,
  afterIndex: number,
): number {
  const rest = content.slice(afterIndex);
  const lines = rest.split('\n');
  let offset = afterIndex;

  for (const line of lines) {
    offset += line.length + 1; // +1 for newline
    if (line.trim() !== '') {
      return offset;
    }
  }

  return offset;
}

/**
 * Build a function/method signature string from regex match groups.
 */
function buildFuncSignature(
  receiverName: string | undefined,
  receiverType: string | undefined,
  funcName: string,
  params: string,
  returnType: string | undefined,
): string {
  const parts: string[] = ['func '];
  if (receiverName && receiverType) {
    parts.push(`(${receiverName} ${receiverType}) `);
  }
  parts.push(`${funcName}(${params})`);
  if (returnType) {
    parts.push(` ${returnType}`);
  }
  return parts.join('');
}

export function createGoParser(): Parser {
  return {
    name: 'go',
    supportedExtensions: GO_EXTENSIONS,

    parse(content: string, filePath: string): readonly ParseResult[] {
      const blockComments = findBlockComments(content);
      const lineCommentGroups = findLineCommentGroups(content);

      // Merge all comment blocks and sort by start line
      const allComments = [...blockComments, ...lineCommentGroups].sort(
        (a, b) => a.startLine - b.startLine,
      );

      const results: ParseResult[] = [];

      for (const comment of allComments) {
        const extraction = extractMetadata(comment.content, comment.startLine);

        if (!extraction.metadata) {
          continue;
        }

        const metadata = extraction.metadata;
        const nextLine = getNextNonEmptyLine(content, comment.endIndex);
        const nextLineNumber = getNextNonEmptyLineNumber(
          content,
          comment.endIndex,
        );

        // Try to match function or method declaration
        const funcMatch = nextLine.match(GO_FUNC_REGEX);
        if (funcMatch) {
          const receiverName = funcMatch[1];
          const receiverType = funcMatch[2];
          const funcName = funcMatch[3];
          const params = funcMatch[4] ?? '';
          const returnType = funcMatch[5]?.trim();
          const isMethod =
            receiverName !== undefined && receiverType !== undefined;

          const signature = buildFuncSignature(
            receiverName,
            receiverType,
            funcName!,
            params,
            returnType,
          );

          results.push({
            name: funcName!,
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'go',
            entityType: metadata.type,
            metadata,
            rawDocstring: comment.content,
            signature,
            parent: isMethod ? receiverType : undefined,
          });
          continue;
        }

        // Try to match struct declaration
        const structMatch = nextLine.match(GO_STRUCT_REGEX);
        if (structMatch) {
          results.push({
            name: structMatch[1]!,
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'go',
            entityType: metadata.type,
            metadata,
            rawDocstring: comment.content,
          });
          continue;
        }

        // Try to match interface declaration
        const interfaceMatch = nextLine.match(GO_INTERFACE_REGEX);
        if (interfaceMatch) {
          results.push({
            name: interfaceMatch[1]!,
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'go',
            entityType: metadata.type,
            metadata,
            rawDocstring: comment.content,
          });
          continue;
        }

        // Try to match const declaration (single or group)
        const constMatch = nextLine.match(GO_CONST_REGEX);
        if (constMatch) {
          results.push({
            name: constMatch[1]!,
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'go',
            entityType: metadata.type,
            metadata,
            rawDocstring: comment.content,
          });
          continue;
        }

        const constGroupMatch = nextLine.match(GO_CONST_GROUP_REGEX);
        if (constGroupMatch) {
          const afterGroupLine = getEndIndexOfNextNonEmptyLine(
            content,
            comment.endIndex,
          );
          const groupIdent = extractFirstGroupIdentifier(
            content,
            afterGroupLine,
          );
          if (groupIdent) {
            const groupLineNumber = getNextNonEmptyLineNumber(
              content,
              afterGroupLine,
            );
            results.push({
              name: groupIdent,
              filePath,
              line: groupLineNumber,
              column: 1,
              language: 'go',
              entityType: metadata.type,
              metadata,
              rawDocstring: comment.content,
            });
            continue;
          }
        }

        // Try to match var declaration (single or group)
        const varMatch = nextLine.match(GO_VAR_REGEX);
        if (varMatch) {
          results.push({
            name: varMatch[1]!,
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'go',
            entityType: metadata.type,
            metadata,
            rawDocstring: comment.content,
          });
          continue;
        }

        const varGroupMatch = nextLine.match(GO_VAR_GROUP_REGEX);
        if (varGroupMatch) {
          const afterGroupLine = getEndIndexOfNextNonEmptyLine(
            content,
            comment.endIndex,
          );
          const groupIdent = extractFirstGroupIdentifier(
            content,
            afterGroupLine,
          );
          if (groupIdent) {
            const groupLineNumber = getNextNonEmptyLineNumber(
              content,
              afterGroupLine,
            );
            results.push({
              name: groupIdent,
              filePath,
              line: groupLineNumber,
              column: 1,
              language: 'go',
              entityType: metadata.type,
              metadata,
              rawDocstring: comment.content,
            });
            continue;
          }
        }

        // Try to match package declaration (module-level)
        const packageMatch = nextLine.match(GO_PACKAGE_REGEX);
        if (packageMatch && isModuleLevelComment(content, comment.startLine)) {
          results.push({
            name: packageMatch[1]!,
            filePath,
            line: nextLineNumber,
            column: 1,
            language: 'go',
            entityType: metadata.type,
            metadata,
            rawDocstring: comment.content,
          });
          continue;
        }

        // Module-level or unrecognized target
        if (isModuleLevelComment(content, comment.startLine)) {
          results.push({
            name: getModuleName(filePath),
            filePath,
            line: comment.startLine,
            column: 1,
            language: 'go',
            entityType: metadata.type,
            metadata,
            rawDocstring: comment.content,
          });
        } else {
          results.push({
            name: 'unknown',
            filePath,
            line: comment.startLine,
            column: 1,
            language: 'go',
            entityType: metadata.type,
            metadata,
            rawDocstring: comment.content,
          });
        }
      }

      return results;
    },
  };
}
