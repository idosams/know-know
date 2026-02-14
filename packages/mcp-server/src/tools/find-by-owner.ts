/**
 * @codegraph
 * type: function
 * description: MCP tool that finds code entities belonging to a specific team or owner
 * owner: codegraph-mcp
 * status: stable
 * tags: [mcp, tool, owner, team]
 * context:
 *   business_goal: Enable AI assistants to find code by team ownership
 *   domain: mcp-tools
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpDatabase } from '../db.js';
import { formatEntityList } from './format.js';

export function registerFindByOwner(server: McpServer, db: McpDatabase): void {
  server.tool(
    'find_code_by_owner',
    'Find all code entities owned by a specific team or person',
    {
      owner: z.string().describe('Owner name or team to search for'),
    },
    async (params) => {
      try {
        const results = db.getByOwner(params.owner);

        return {
          content: [{ type: 'text' as const, text: formatEntityList(results) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error finding by owner: ${String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
