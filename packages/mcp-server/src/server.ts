/**
 * @codegraph
 * type: service
 * description: MCP server factory and stdio transport initialization
 * owner: codegraph-mcp
 * status: stable
 * tags: [mcp, server, transport, stdio]
 * context:
 *   business_goal: Expose code graph data to AI assistants via MCP protocol
 *   domain: mcp-server
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { openDatabase } from './db.js';
import { registerAllTools } from './tools/index.js';

export interface ServerOptions {
  readonly dbPath: string;
  readonly verbose?: boolean;
}

export function createServer(options: ServerOptions): McpServer {
  const server = new McpServer({
    name: 'codegraph',
    version: '0.1.0',
  });

  try {
    const db = openDatabase(options.dbPath);
    registerAllTools(server, db);
  } catch (error) {
    if (options.verbose) {
      console.error(`Failed to open database at ${options.dbPath}:`, error);
    }

    // Register a single tool that reports the database error
    server.tool(
      'get_graph_overview',
      'Get statistics and overview of the indexed codebase',
      {},
      async () => ({
        content: [
          {
            type: 'text' as const,
            text: `Database not available at ${options.dbPath}. Run 'codegraph index' to create it.`,
          },
        ],
        isError: true,
      }),
    );
  }

  return server;
}

export async function startServer(options: ServerOptions): Promise<void> {
  const server = createServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
