import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpDatabase } from '../db.js';
import { formatDependencies } from './format.js';

export function registerGetDependencies(server: McpServer, db: McpDatabase): void {
  server.tool(
    'get_code_dependencies',
    'Get the dependency tree for a specific code entity',
    {
      entity_id: z.string().describe('The entity ID to get dependencies for'),
      depth: z.number().optional().describe('How many levels deep to traverse (default 1)'),
    },
    async (params) => {
      try {
        const deps = db.getDependencies(params.entity_id, params.depth);

        return {
          content: [
            { type: 'text' as const, text: formatDependencies(params.entity_id, deps) },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error getting dependencies: ${String(error)}` },
          ],
          isError: true,
        };
      }
    }
  );
}
