/**
 * @knowgraph
 * type: function
 * description: MCP tool that provides codebase-wide statistics and summary
 * owner: knowgraph-mcp
 * status: stable
 * tags: [mcp, tool, overview, statistics]
 * context:
 *   business_goal: Give AI assistants a high-level view of the codebase
 *   domain: mcp-tools
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpDatabase } from '../db.js';
import { formatStats } from './format.js';

export function registerGraphOverview(
  server: McpServer,
  db: McpDatabase,
): void {
  server.tool(
    'get_graph_overview',
    'Get statistics and overview of the indexed codebase',
    {},
    async () => {
      try {
        const stats = db.getStats();

        return {
          content: [{ type: 'text' as const, text: formatStats(stats) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting graph overview: ${String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
