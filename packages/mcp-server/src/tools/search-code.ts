import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpDatabase } from '../db.js';
import { formatEntityList } from './format.js';

export function registerSearchCode(server: McpServer, db: McpDatabase): void {
  server.tool(
    'search_code',
    'Search for code entities by description, name, or tags',
    {
      query: z.string().describe('Search query text'),
      type: z.string().optional().describe('Entity type filter (e.g., function, class, module)'),
      owner: z.string().optional().describe('Owner/team filter'),
      tags: z.array(z.string()).optional().describe('Tag filters'),
      limit: z.number().optional().describe('Max results (default 20)'),
    },
    async (params) => {
      try {
        const results = db.search(params.query, {
          type: params.type,
          owner: params.owner,
          tags: params.tags,
          limit: params.limit,
        });

        return {
          content: [{ type: 'text' as const, text: formatEntityList(results) }],
        };
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error searching code: ${String(error)}` },
          ],
          isError: true,
        };
      }
    }
  );
}
