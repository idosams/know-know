/**
 * @knowgraph
 * type: module
 * description: CLI command that syncs external knowledge connectors (Notion, Jira) with the code graph
 * owner: knowgraph-cli
 * status: experimental
 * tags: [cli, command, sync, connectors]
 * context:
 *   business_goal: Let developers enrich their code knowledge graph with external tool metadata
 *   domain: cli
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { parse as parseYaml } from 'yaml';
import {
  createDefaultConnectorRegistry,
  createDatabaseManager,
  ManifestSchema,
} from '@knowgraph/core';
import type {
  ConnectorConfig,
  ConnectorSyncResult,
} from '@knowgraph/core';

interface SyncCommandOptions {
  readonly dryRun?: boolean;
  readonly owner?: string;
  readonly tags?: string;
  readonly verbose?: boolean;
  readonly config?: string;
}

function loadManifest(
  configPath: string,
): ReturnType<typeof ManifestSchema.safeParse> {
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = parseYaml(raw) as unknown;
  return ManifestSchema.safeParse(parsed);
}

export function formatResult(
  result: ConnectorSyncResult,
  verbose: boolean,
): string {
  const lines: string[] = [];
  const hasErrors = result.errors.length > 0;
  const icon = hasErrors ? chalk.yellow('!') : chalk.green('\u2714');

  lines.push(`${icon} ${chalk.bold(result.connector)} connector`);
  lines.push(
    `  Processed ${chalk.cyan(String(result.entitiesProcessed))} entities, ` +
      `added ${chalk.cyan(String(result.linksAdded))} links, ` +
      `updated ${chalk.cyan(String(result.linksUpdated))} links ` +
      `(${result.duration}ms)`,
  );

  if (hasErrors && verbose) {
    for (const err of result.errors) {
      lines.push(chalk.yellow(`  Error: ${err.message}`));
    }
  } else if (hasErrors) {
    lines.push(chalk.yellow(`  ${result.errors.length} error(s) occurred`));
  }

  return lines.join('\n');
}

async function runSync(
  connectorNames: readonly string[],
  options: SyncCommandOptions,
): Promise<void> {
  const configPath = resolve(options.config ?? '.knowgraph.yml');

  if (!existsSync(configPath)) {
    console.error(
      chalk.red(
        `Error: Config not found: ${configPath}\nRun ${chalk.cyan('knowgraph init')} to create one.`,
      ),
    );
    process.exitCode = 1;
    return;
  }

  const manifestResult = loadManifest(configPath);
  if (!manifestResult.success) {
    console.error(
      chalk.red(`Error: Invalid config: ${manifestResult.error.message}`),
    );
    process.exitCode = 1;
    return;
  }

  const manifest = manifestResult.data;
  const connectorConfigs = manifest.connectors ?? {};

  // Determine which connectors to sync
  const availableConnectors = Object.entries(connectorConfigs)
    .filter(
      ([, config]) =>
        config && 'enabled' in (config as Record<string, unknown>),
    )
    .map(([name]) => name)
    .filter((name) => name !== 'webhook');

  const requestedConnectors =
    connectorNames.length > 0
      ? connectorNames.filter((n) => availableConnectors.includes(n))
      : availableConnectors;

  if (requestedConnectors.length === 0) {
    console.log(
      chalk.yellow(
        'No connectors configured. Add connectors to your .knowgraph.yml:',
      ),
    );
    console.log(
      chalk.dim(
        `\nconnectors:\n  notion:\n    enabled: true\n    api_key_env: NOTION_API_KEY\n  jira:\n    enabled: true\n    api_key_env: JIRA_API_KEY\n    base_url: https://your-team.atlassian.net`,
      ),
    );
    return;
  }

  // Load database
  const outputDir = resolve(manifest.index?.output_dir ?? '.knowgraph');
  const dbPath = join(outputDir, 'knowgraph.db');

  if (!existsSync(dbPath)) {
    console.error(
      chalk.red(
        `Error: Database not found at ${dbPath}\nRun ${chalk.cyan('knowgraph index')} first.`,
      ),
    );
    process.exitCode = 1;
    return;
  }

  const dbManager = createDatabaseManager(dbPath);
  dbManager.initialize();

  const spinner = ora(
    options.dryRun ? 'Previewing sync (dry run)...' : 'Syncing connectors...',
  ).start();

  try {
    const registry = createDefaultConnectorRegistry();

    // Build configs map — only include requested connectors
    const configs: Record<string, ConnectorConfig> = {};
    for (const name of requestedConnectors) {
      const raw = connectorConfigs[name as keyof typeof connectorConfigs];
      if (raw) {
        configs[name] = raw as ConnectorConfig;
      }
    }

    // Build entity filter
    const entityFilter =
      options.owner || options.tags
        ? {
            owner: options.owner,
            tags: options.tags
              ?.split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          }
        : undefined;

    const results = await registry.syncAll({
      dbManager,
      configs,
      entityFilter,
      dryRun: options.dryRun ?? false,
      onProgress: (name, result) => {
        spinner.text = `Syncing ${name}... (${result.entitiesProcessed} entities)`;
      },
    });

    spinner.stop();

    // Print results
    const dryRunLabel = options.dryRun ? chalk.dim(' [dry run]') : '';
    console.log('');
    for (const result of results) {
      console.log(formatResult(result, options.verbose ?? false));
    }

    // Summary
    const totalAdded = results.reduce((sum, r) => sum + r.linksAdded, 0);
    const totalUpdated = results.reduce(
      (sum, r) => sum + r.linksUpdated,
      0,
    );
    const totalErrors = results.reduce(
      (sum, r) => sum + r.errors.length,
      0,
    );

    console.log('');
    if (totalErrors > 0) {
      console.log(
        chalk.yellow(
          `Sync complete${dryRunLabel}: ${totalAdded} new links, ${totalUpdated} updated links, ${totalErrors} error(s)`,
        ),
      );
    } else {
      console.log(
        chalk.green(
          `\u2714 Sync complete!${dryRunLabel} ${totalAdded} new links, ${totalUpdated} updated links`,
        ),
      );
    }
  } catch (err) {
    spinner.fail(chalk.red('Sync failed'));
    console.error(
      chalk.red(err instanceof Error ? err.message : String(err)),
    );
    process.exitCode = 1;
  } finally {
    dbManager.close();
  }
}

export function registerSyncCommand(program: Command): void {
  program
    .command('sync [connectors...]')
    .description(
      'Sync external knowledge connectors (e.g. Notion, Jira) with the code graph',
    )
    .option('--dry-run', 'Preview changes without writing to database')
    .option(
      '--owner <owner>',
      'Only sync entities owned by this team/person',
    )
    .option(
      '--tags <tags>',
      'Only sync entities with these tags (comma-separated)',
    )
    .option('--verbose', 'Show detailed progress and errors')
    .option(
      '--config <path>',
      'Path to .knowgraph.yml config file',
      '.knowgraph.yml',
    )
    .action(async (connectors: string[], options: SyncCommandOptions) => {
      await runSync(connectors, options);
    });
}
