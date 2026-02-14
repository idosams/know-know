import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServer } from '../server.js';

describe('createServer', () => {
  it('creates an MCP server instance', () => {
    // This will fail to open the DB, but should still create a server
    const server = createServer({ dbPath: '/nonexistent/path/db.sqlite' });
    expect(server).toBeInstanceOf(McpServer);
  });

  it('handles missing database gracefully', () => {
    // Should not throw even with bad path
    expect(() =>
      createServer({ dbPath: '/nonexistent/path/db.sqlite' })
    ).not.toThrow();
  });

  it('accepts verbose option', () => {
    expect(() =>
      createServer({ dbPath: '/nonexistent/path/db.sqlite', verbose: true })
    ).not.toThrow();
  });
});
