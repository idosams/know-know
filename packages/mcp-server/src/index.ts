#!/usr/bin/env node
import { startServer } from './server.js';

export { createServer, startServer } from './server.js';
export type { ServerOptions } from './server.js';
export { openDatabase, createInMemoryDatabase } from './db.js';
export type { McpDatabase, EntityRow, LinkRow, DependencyRow, GraphStats, SearchFilters } from './db.js';
export { generateClaudeDesktopConfig } from './config.js';

const isDirectRun = process.argv[1]?.endsWith('mcp-server/dist/index.js') ||
  process.argv[1]?.endsWith('mcp-server/src/index.ts');

if (isDirectRun) {
  const dbPath = process.argv[2] || '.codegraph/codegraph.db';
  const verbose = process.argv.includes('--verbose');

  startServer({ dbPath, verbose }).catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}
