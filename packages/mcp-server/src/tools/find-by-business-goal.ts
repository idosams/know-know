import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpDatabase } from '../db.js';
import { formatEntityList } from './format.js';

export function registerFindByBusinessGoal(server: McpServer, db: McpDatabase): void {
  server.tool(
    'find_code_by_business_goal',
    'Find code entities related to a specific business goal or context',
    {
      goal: z.string().describe('Business goal or context to search for'),
    },
    async (params) => {
      try {
        const results = db.getByBusinessGoal(params.goal);

        return {
          content: [{ type: 'text' as const, text: formatEntityList(results) }],
        };
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error finding by business goal: ${String(error)}` },
          ],
          isError: true,
        };
      }
    }
  );
}
