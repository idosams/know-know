/**
 * @knowgraph
 * type: module
 * description: Claude Desktop MCP configuration generator
 * owner: knowgraph-mcp
 * status: stable
 * tags: [mcp, config, claude-desktop]
 * context:
 *   business_goal: Simplify MCP server setup for Claude Desktop users
 *   domain: mcp-server
 */
import path from 'node:path';

export function generateClaudeDesktopConfig(projectPath: string): object {
  return {
    mcpServers: {
      knowgraph: {
        command: 'node',
        args: [
          path.join(
            projectPath,
            'node_modules/@knowgraph/mcp-server/dist/index.js',
          ),
          path.join(projectPath, '.knowgraph/knowgraph.db'),
        ],
      },
    },
  };
}
