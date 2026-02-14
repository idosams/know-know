import path from 'node:path';

export function generateClaudeDesktopConfig(projectPath: string): object {
  return {
    mcpServers: {
      codegraph: {
        command: 'node',
        args: [
          path.join(projectPath, 'node_modules/@codegraph/mcp-server/dist/index.js'),
          path.join(projectPath, '.codegraph/codegraph.db'),
        ],
      },
    },
  };
}
