#!/usr/bin/env node
/**
 * @codegraph
 * type: module
 * description: MCP server entrypoint with exports and direct-run capability
 * owner: codegraph-mcp
 * status: stable
 * tags: [mcp, entrypoint, exports]
 * context:
 *   business_goal: Provide the main entry point for the MCP server package
 *   domain: mcp-server
 */
import { startServer } from './server.js';

export { createServer, startServer } from './server.js';
export type { ServerOptions } from './server.js';
export { openDatabase, createInMemoryDatabase } from './db.js';
export type {
  McpDatabase,
  EntityRow,
  LinkRow,
  DependencyRow,
  GraphStats,
  SearchFilters,
} from './db.js';
export { generateClaudeDesktopConfig } from './config.js';

const isDirectRun =
  process.argv[1]?.endsWith('mcp-server/dist/index.js') ||
  process.argv[1]?.endsWith('mcp-server/src/index.ts');

if (isDirectRun) {
  const dbPath = process.argv[2] || '.codegraph/codegraph.db';
  const verbose = process.argv.includes('--verbose');

  startServer({ dbPath, verbose }).catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}
