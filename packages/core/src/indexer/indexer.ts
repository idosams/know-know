/**
 * @knowgraph
 * type: module
 * description: File system scanner and indexer with incremental updates and .gitignore support
 * owner: knowgraph-core
 * status: stable
 * tags: [indexer, scanner, incremental, filesystem]
 * context:
 *   business_goal: Efficiently scan and index codebases with minimal re-processing
 *   domain: indexer-engine
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'glob';
import ignore from 'ignore';
import type { ParseResult } from '../types/index.js';
import { type DatabaseManager } from './database.js';
import type { IndexError, IndexerOptions, IndexResult } from './types.js';

export type ParserFn = (
  filePath: string,
  content: string,
) => readonly ParseResult[];

export interface ParserRegistry {
  readonly parse: (filePath: string, content: string) => readonly ParseResult[];
  readonly canParse: (filePath: string) => boolean;
}

function computeFileHash(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

function loadGitignorePatterns(rootDir: string): ReturnType<typeof ignore> {
  const ig = ignore();
  try {
    const gitignoreContent = readFileSync(join(rootDir, '.gitignore'), 'utf-8');
    ig.add(gitignoreContent);
  } catch {
    // No .gitignore file, that's fine
  }
  return ig;
}

function collectFiles(
  rootDir: string,
  excludePatterns: readonly string[],
): readonly string[] {
  const ig = loadGitignorePatterns(rootDir);
  for (const pattern of excludePatterns) {
    ig.add(pattern);
  }

  const allFiles = globSync('**/*', {
    cwd: rootDir,
    nodir: true,
    dot: false,
    absolute: false,
  });

  return allFiles.filter((f) => !ig.ignores(f));
}

export function createIndexer(
  parserRegistry: ParserRegistry,
  dbManager: DatabaseManager,
): {
  readonly index: (options: IndexerOptions) => IndexResult;
} {
  function index(options: IndexerOptions): IndexResult {
    const {
      rootDir,
      exclude = ['node_modules', '.git', 'dist', 'build'],
      incremental = false,
      onProgress,
    } = options;

    const startTime = Date.now();
    const errors: IndexError[] = [];
    let totalEntities = 0;
    let totalRelationships = 0;

    const files = collectFiles(rootDir, exclude);
    const parsableFiles = files.filter((f) => parserRegistry.canParse(f));

    for (let i = 0; i < parsableFiles.length; i++) {
      const relPath = parsableFiles[i];
      const absPath = join(rootDir, relPath);

      if (onProgress) {
        onProgress({
          totalFiles: parsableFiles.length,
          processedFiles: i,
          currentFile: relPath,
          entitiesFound: totalEntities,
        });
      }

      try {
        const content = readFileSync(absPath, 'utf-8');
        const fileHash = computeFileHash(content);

        if (incremental) {
          const existingHash = dbManager.getFileHash(relPath);
          if (existingHash === fileHash) {
            continue;
          }
        }

        // Remove old entities for this file path
        dbManager.deleteEntitiesByFilePath(relPath);

        const results = parserRegistry.parse(absPath, content);

        for (const result of results) {
          const entityId = dbManager.insertEntity({
            filePath: relPath,
            name: result.name,
            entityType: result.entityType,
            description: result.metadata.description,
            rawDocstring: result.rawDocstring,
            signature: result.signature,
            parent: result.parent,
            language: result.language,
            line: result.line,
            column: result.column,
            owner: result.metadata.owner,
            status: result.metadata.status,
            metadata: result.metadata,
            tags: result.metadata.tags,
            links: result.metadata.links,
            fileHash,
          });

          // Handle dependency relationships from extended metadata
          if (
            'dependencies' in result.metadata &&
            result.metadata.dependencies
          ) {
            const deps = result.metadata.dependencies;
            const allDeps = [
              ...(deps.services ?? []),
              ...(deps.external_apis ?? []),
              ...(deps.databases ?? []),
            ];
            for (const dep of allDeps) {
              // Store relationship by name - target may not exist yet
              try {
                dbManager.insertRelationship(entityId, dep, 'depends_on');
              } catch {
                // Target may not exist, skip
              }
            }
            totalRelationships += allDeps.length;
          }

          totalEntities++;
        }
      } catch (err) {
        errors.push({
          filePath: relPath,
          message: err instanceof Error ? err.message : String(err),
          error: err,
        });
      }
    }

    if (onProgress) {
      onProgress({
        totalFiles: parsableFiles.length,
        processedFiles: parsableFiles.length,
        currentFile: '',
        entitiesFound: totalEntities,
      });
    }

    const duration = Date.now() - startTime;

    return {
      totalFiles: parsableFiles.length,
      totalEntities,
      totalRelationships,
      errors,
      duration,
    };
  }

  return { index };
}
