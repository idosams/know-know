/**
 * @codegraph
 * type: module
 * description: CLI command that starts the MCP server for AI agent integration
 * owner: codegraph-cli
 * status: stable
 * tags: [cli, command, serve, mcp]
 * context:
 *   business_goal: Enable AI assistants to query the code graph via MCP protocol
 *   domain: cli
 */
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import type { Command } from 'commander';
import chalk from 'chalk';

interface ServeOptions {
  readonly db: string;
  readonly verbose?: boolean;
}

async function runServe(options: ServeOptions): Promise<void> {
  const dbPath = resolve(options.db);

  if (!existsSync(dbPath)) {
    console.error(chalk.red(`Error: Database not found at ${dbPath}`));
    console.error(
      chalk.yellow("Run 'codegraph index' first to create the database."),
    );
    process.exitCode = 1;
    return;
  }

  console.log(chalk.bold('Starting CodeGraph MCP server...'));
  console.log(`  Database: ${chalk.cyan(dbPath)}`);
  console.log('');
  console.log(chalk.dim('Add this to your Claude Desktop config:'));
  console.log('');
  console.log(
    chalk.dim(
      JSON.stringify(
        {
          mcpServers: {
            codegraph: {
              command: 'npx',
              args: ['codegraph', 'serve', '--db', dbPath],
            },
          },
        },
        null,
        2,
      ),
    ),
  );
  console.log('');

  try {
    const { startServer } = await import('@codegraph/mcp-server');
    await startServer({ dbPath, verbose: options.verbose });
  } catch (err) {
    console.error(
      chalk.red(
        `Failed to start MCP server: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
    process.exitCode = 1;
  }
}

export function registerServeCommand(program: Command): void {
  program
    .command('serve')
    .description('Start the MCP server')
    .option('--db <path>', 'Database path', '.codegraph/codegraph.db')
    .option('--verbose', 'Enable verbose logging')
    .action((options: ServeOptions) => {
      runServe(options);
    });
}
