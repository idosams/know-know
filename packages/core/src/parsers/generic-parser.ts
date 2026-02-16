/**
 * @knowgraph
 * type: module
 * description: Language-agnostic fallback parser using regex-based comment extraction
 * owner: knowgraph-core
 * status: stable
 * tags: [parser, generic, regex, fallback]
 * context:
 *   business_goal: Provide annotation support for any language with standard comment syntax
 *   domain: parser-engine
 */
import type { ParseResult } from '../types/parse-result.js';
import type { Parser } from './types.js';
import { extractMetadata } from './metadata-extractor.js';

/**
 * Regex for block comments: /* ... * / or """ ... """
 */
const BLOCK_COMMENT_REGEX = /\/\*[\s\S]*?\*\/|"""[\s\S]*?"""|'''[\s\S]*?'''/g;

/**
 * Regex for consecutive single-line comments (# or //)
 */
const SINGLE_LINE_COMMENT_GROUP_REGEX = /(?:^[ \t]*(?:\/\/|#).*\n?)+/gm;

function getLineNumber(source: string, charIndex: number): number {
  let line = 1;
  for (let i = 0; i < charIndex && i < source.length; i++) {
    if (source[i] === '\n') {
      line++;
    }
  }
  return line;
}

function stripBlockComment(raw: string): string {
  // Handle /* ... */
  if (raw.startsWith('/*') && raw.endsWith('*/')) {
    const inner = raw.slice(2, -2);
    return inner
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, ''))
      .join('\n')
      .trim();
  }
  // Handle """ ... """ or ''' ... '''
  if (
    (raw.startsWith('"""') && raw.endsWith('"""')) ||
    (raw.startsWith("'''") && raw.endsWith("'''"))
  ) {
    return raw.slice(3, -3).trim();
  }
  return raw;
}

function stripLineComments(raw: string): string {
  return raw
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('//')) {
        return trimmed.slice(2).trimStart();
      }
      if (trimmed.startsWith('#')) {
        return trimmed.slice(1).trimStart();
      }
      return trimmed;
    })
    .join('\n')
    .trim();
}

function getModuleName(filePath: string): string {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1] ?? '';
  // Remove any extension
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  const languageMap: Record<string, string> = {
    '.py': 'python',
    '.pyi': 'python',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.kt': 'kotlin',
    '.swift': 'swift',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.php': 'php',
    '.sh': 'shell',
    '.bash': 'shell',
    '.zsh': 'shell',
    '.lua': 'lua',
    '.r': 'r',
    '.R': 'r',
    '.scala': 'scala',
    '.ex': 'elixir',
    '.exs': 'elixir',
  };
  return languageMap[ext] ?? 'unknown';
}

export function createGenericParser(): Parser {
  return {
    name: 'generic',
    supportedExtensions: [],

    parse(content: string, filePath: string): readonly ParseResult[] {
      const results: ParseResult[] = [];
      const language = getLanguageFromPath(filePath);

      // Find block comments
      const blockRegex = new RegExp(BLOCK_COMMENT_REGEX.source, 'g');
      let match: RegExpExecArray | null;

      while ((match = blockRegex.exec(content)) !== null) {
        const stripped = stripBlockComment(match[0]);
        if (
          !stripped.includes('@knowgraph') &&
          !stripped.includes('knowgraph:')
        ) {
          continue;
        }

        const startLine = getLineNumber(content, match.index);
        const extraction = extractMetadata(stripped, startLine);

        if (extraction.metadata) {
          results.push({
            name: getModuleName(filePath),
            filePath,
            line: startLine,
            column: 1,
            language,
            entityType: extraction.metadata.type,
            metadata: extraction.metadata,
            rawDocstring: stripped,
          });
        }
      }

      // Find groups of single-line comments
      const lineRegex = new RegExp(
        SINGLE_LINE_COMMENT_GROUP_REGEX.source,
        'gm',
      );

      while ((match = lineRegex.exec(content)) !== null) {
        const stripped = stripLineComments(match[0]);
        if (
          !stripped.includes('@knowgraph') &&
          !stripped.includes('knowgraph:')
        ) {
          continue;
        }

        const startLine = getLineNumber(content, match.index);
        const extraction = extractMetadata(stripped, startLine);

        if (extraction.metadata) {
          results.push({
            name: getModuleName(filePath),
            filePath,
            line: startLine,
            column: 1,
            language,
            entityType: extraction.metadata.type,
            metadata: extraction.metadata,
            rawDocstring: stripped,
          });
        }
      }

      return results;
    },
  };
}
