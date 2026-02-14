import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpDatabase } from '../db.js';
import { formatEntity, formatLinks, formatDependencies } from './format.js';

export function registerGetEntityDetails(server: McpServer, db: McpDatabase): void {
  server.tool(
    'get_entity_details',
    'Get full metadata for a specific code entity including links and dependencies',
    {
      entity_id: z.string().describe('The entity ID to look up'),
    },
    async (params) => {
      try {
        const entity = db.getById(params.entity_id);

        if (!entity) {
          return {
            content: [
              { type: 'text' as const, text: `Entity not found: ${params.entity_id}` },
            ],
            isError: true,
          };
        }

        const links = db.getLinks(params.entity_id);
        const deps = db.getDependencies(params.entity_id);

        const sections = [
          formatEntity(entity),
          '',
          '### External Links',
          formatLinks(links),
          '',
          formatDependencies(params.entity_id, deps),
        ];

        return {
          content: [{ type: 'text' as const, text: sections.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error getting entity details: ${String(error)}` },
          ],
          isError: true,
        };
      }
    }
  );
}
