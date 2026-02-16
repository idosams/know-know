import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { generateClaudeDesktopConfig } from '../config.js';

describe('generateClaudeDesktopConfig', () => {
  it('generates valid config structure', () => {
    const config = generateClaudeDesktopConfig('/project');
    expect(config).toHaveProperty('mcpServers');
    expect(config).toHaveProperty('mcpServers.knowgraph');
  });

  it('uses node command', () => {
    const config = generateClaudeDesktopConfig('/project') as {
      mcpServers: { knowgraph: { command: string } };
    };
    expect(config.mcpServers.knowgraph.command).toBe('node');
  });

  it('constructs correct args paths', () => {
    const projectPath = '/my/project';
    const config = generateClaudeDesktopConfig(projectPath) as {
      mcpServers: { knowgraph: { args: string[] } };
    };

    expect(config.mcpServers.knowgraph.args).toHaveLength(2);
    expect(config.mcpServers.knowgraph.args[0]).toBe(
      path.join(projectPath, 'node_modules/@knowgraph/mcp-server/dist/index.js')
    );
    expect(config.mcpServers.knowgraph.args[1]).toBe(
      path.join(projectPath, '.knowgraph/knowgraph.db')
    );
  });

  it('handles different project paths', () => {
    const config1 = generateClaudeDesktopConfig('/path/one') as {
      mcpServers: { knowgraph: { args: string[] } };
    };
    const config2 = generateClaudeDesktopConfig('/path/two') as {
      mcpServers: { knowgraph: { args: string[] } };
    };

    expect(config1.mcpServers.knowgraph.args[0]).toContain('/path/one');
    expect(config2.mcpServers.knowgraph.args[0]).toContain('/path/two');
  });
});
