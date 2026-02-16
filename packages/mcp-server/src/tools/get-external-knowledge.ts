/**
 * @knowgraph
 * type: function
 * description: MCP tool that retrieves external documentation links for entities
 * owner: knowgraph-mcp
 * status: stable
 * tags: [mcp, tool, links, documentation]
 * context:
 *   business_goal: Connect code to external knowledge sources for AI assistants
 *   domain: mcp-tools
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpDatabase } from '../db.js';
import { formatLinks } from './format.js';

export function registerGetExternalKnowledge(
  server: McpServer,
  db: McpDatabase,
): void {
  server.tool(
    'get_external_knowledge',
    'Get external links (Notion, Jira, etc.) for an entity or all entities',
    {
      entity_id: z
        .string()
        .optional()
        .describe('Entity ID to get links for (omit for all)'),
      type: z
        .string()
        .optional()
        .describe('Link type filter (notion, jira, linear, etc.)'),
    },
    async (params) => {
      try {
        const allLinks = db.getLinks(params.entity_id);

        const filtered = params.type
          ? allLinks.filter((link) => link.type === params.type)
          : allLinks;

        return {
          content: [{ type: 'text' as const, text: formatLinks(filtered) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting external knowledge: ${String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
