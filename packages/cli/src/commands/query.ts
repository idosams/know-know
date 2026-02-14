import { resolve } from 'node:path';
import type { Command } from 'commander';
import chalk from 'chalk';
import { createDatabaseManager, createQueryEngine } from '@codegraph/core';
import type { EntityType } from '@codegraph/core';
import { formatTable, formatJson } from '../utils/format.js';

interface QueryCommandOptions {
  readonly type?: string;
  readonly owner?: string;
  readonly tags?: string;
  readonly format: string;
  readonly limit: string;
  readonly db: string;
}

function runQuery(searchTerm: string, options: QueryCommandOptions): void {
  const dbPath = resolve(options.db);

  let dbManager;
  try {
    dbManager = createDatabaseManager(dbPath);
  } catch {
    console.error(chalk.red(`Error: Could not open database at ${dbPath}`));
    console.error(
      chalk.yellow("Run 'codegraph index' first to create the database."),
    );
    process.exitCode = 1;
    return;
  }

  try {
    const engine = createQueryEngine(dbManager);

    const tags = options.tags
      ? options.tags.split(',').map((t) => t.trim())
      : undefined;

    const result = engine.search({
      query: searchTerm,
      type: options.type as EntityType | undefined,
      owner: options.owner,
      tags,
      limit: parseInt(options.limit, 10),
    });

    if (result.entities.length === 0) {
      console.log(chalk.yellow('No results found.'));
      return;
    }

    if (options.format === 'json') {
      console.log(formatJson(result.entities, true));
    } else {
      console.log(formatTable(result.entities));
    }

    console.error(
      chalk.dim(
        `\nShowing ${result.entities.length} of ${result.total} results`,
      ),
    );
  } catch (err) {
    console.error(
      chalk.red(
        `Query failed: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
    process.exitCode = 1;
  } finally {
    dbManager.close();
  }
}

export function registerQueryCommand(program: Command): void {
  program
    .command('query <search-term>')
    .description('Search the code graph')
    .option('--type <type>', 'Filter by entity type')
    .option('--owner <owner>', 'Filter by owner')
    .option('--tags <tags>', 'Comma-separated tag filter')
    .option('--format <format>', 'Output format (json|table)', 'table')
    .option('--limit <n>', 'Max results', '20')
    .option('--db <path>', 'Database path', '.codegraph/codegraph.db')
    .action((searchTerm: string, options: QueryCommandOptions) => {
      runQuery(searchTerm, options);
    });
}
