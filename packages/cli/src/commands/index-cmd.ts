/**
 * @knowgraph
 * type: module
 * description: CLI command that builds the SQLite code graph index from annotated source files
 * owner: knowgraph-cli
 * status: stable
 * tags: [cli, command, index, build]
 * context:
 *   business_goal: Enable developers to build a searchable code knowledge graph
 *   domain: cli
 */
import { mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  createDefaultRegistry,
  createDatabaseManager,
  createIndexer,
} from '@knowgraph/core';
import type { IndexProgress } from '@knowgraph/core';

interface IndexOptions {
  readonly output: string;
  readonly exclude?: string;
  readonly incremental: boolean;
  readonly verbose?: boolean;
}

function createParserRegistryAdapter(
  coreRegistry: ReturnType<typeof createDefaultRegistry>,
) {
  return {
    parse(filePath: string, content: string) {
      return coreRegistry.parseFile(content, filePath);
    },
    canParse(filePath: string) {
      return coreRegistry.getParser(filePath) !== undefined;
    },
  };
}

function runIndex(targetPath: string, options: IndexOptions): void {
  const rootDir = resolve(targetPath);
  const outputDir = resolve(options.output);
  const dbPath = join(outputDir, 'knowgraph.db');

  mkdirSync(outputDir, { recursive: true });

  const spinner = ora('Initializing indexer...').start();

  try {
    const coreRegistry = createDefaultRegistry();
    const registryAdapter = createParserRegistryAdapter(coreRegistry);
    const dbManager = createDatabaseManager(dbPath);
    dbManager.initialize();

    const indexer = createIndexer(registryAdapter, dbManager);

    const excludePatterns = options.exclude
      ? options.exclude.split(',').map((p) => p.trim())
      : ['node_modules', '.git', 'dist', 'build'];

    const onProgress = (progress: IndexProgress): void => {
      const pct =
        progress.totalFiles > 0
          ? Math.round((progress.processedFiles / progress.totalFiles) * 100)
          : 0;
      spinner.text = `Indexing: ${pct}% (${progress.processedFiles}/${progress.totalFiles}) ${progress.currentFile}`;

      if (options.verbose && progress.currentFile) {
        spinner.text += `\n  Entities found: ${progress.entitiesFound}`;
      }
    };

    const result = indexer.index({
      rootDir,
      exclude: excludePatterns,
      incremental: options.incremental,
      onProgress,
    });

    dbManager.close();

    spinner.succeed(chalk.green('Indexing complete!'));

    console.log('');
    console.log(chalk.bold('Summary:'));
    console.log(`  Files scanned:    ${chalk.cyan(String(result.totalFiles))}`);
    console.log(
      `  Entities indexed: ${chalk.cyan(String(result.totalEntities))}`,
    );
    console.log(
      `  Relationships:    ${chalk.cyan(String(result.totalRelationships))}`,
    );
    console.log(`  Duration:         ${chalk.cyan(`${result.duration}ms`)}`);
    console.log(`  Database:         ${chalk.cyan(dbPath)}`);

    if (result.errors.length > 0) {
      console.log('');
      console.log(
        chalk.yellow(`${result.errors.length} error(s) during indexing:`),
      );
      for (const err of result.errors.slice(0, 10)) {
        console.log(chalk.yellow(`  ${err.filePath}: ${err.message}`));
      }
      if (result.errors.length > 10) {
        console.log(
          chalk.yellow(`  ... and ${result.errors.length - 10} more`),
        );
      }
    }
  } catch (err) {
    spinner.fail(chalk.red('Indexing failed'));
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exitCode = 1;
  }
}

export function registerIndexCommand(program: Command): void {
  program
    .command('index [path]')
    .description('Scan repository and build the SQLite index')
    .option('--output <dir>', 'Output directory', '.knowgraph')
    .option('--exclude <patterns>', 'Comma-separated glob patterns to exclude')
    .option(
      '--incremental',
      'Only re-index changed files (default: true)',
      true,
    )
    .option('--no-incremental', 'Force full re-index')
    .option('--verbose', 'Show detailed progress')
    .action((path: string | undefined, options: IndexOptions) => {
      runIndex(path ?? '.', options);
    });
}
