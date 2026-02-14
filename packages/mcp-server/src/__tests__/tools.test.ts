import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from '../tools/index.js';
import { createTestDatabase, seedTestData } from './test-helper.js';
import type { TestContext } from './test-helper.js';

interface RegisteredTool {
  readonly handler: (
    args: Record<string, unknown>,
    extra: Record<string, unknown>,
  ) => Promise<unknown>;
  readonly inputSchema?: unknown;
}

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown> = {},
): Promise<{
  readonly content: ReadonlyArray<{
    readonly type: string;
    readonly text: string;
  }>;
  readonly isError?: boolean;
}> {
  const tools = (
    server as unknown as { _registeredTools: Record<string, RegisteredTool> }
  )._registeredTools;
  const tool = tools[name];
  if (!tool) {
    throw new Error(`Tool ${name} not registered`);
  }
  return tool.handler(args, {}) as Promise<{
    content: ReadonlyArray<{ type: string; text: string }>;
    isError?: boolean;
  }>;
}

describe('MCP Tools Integration', () => {
  let ctx: TestContext;
  let server: McpServer;

  beforeEach(() => {
    ctx = createTestDatabase();
    seedTestData(ctx.rawDb);
    server = new McpServer({ name: 'test', version: '0.0.1' });
    registerAllTools(server, ctx.db);
  });

  afterEach(() => {
    ctx.db.close();
  });

  describe('search_code', () => {
    it('returns matching entities', async () => {
      const result = await callTool(server, 'search_code', {
        query: 'authentication',
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('AuthService');
    });

    it('filters by type', async () => {
      const result = await callTool(server, 'search_code', {
        query: '',
        type: 'function',
      });
      expect(result.content[0].text).toContain('processPayment');
      expect(result.content[0].text).not.toContain('AuthService');
    });

    it('returns no-results message for unmatched query', async () => {
      await callTool(server, 'search_code', { query: '' });
      // With empty query and no filters, falls back to LIKE which matches everything
      // Use a specific nonexistent owner to get no results
      const result2 = await callTool(server, 'search_code', {
        query: '',
        owner: 'zzz_nonexistent_zzz',
      });
      expect(result2.content[0].text).toContain('No entities found');
    });
  });

  describe('find_code_by_owner', () => {
    it('returns entities for a given owner', async () => {
      const result = await callTool(server, 'find_code_by_owner', {
        owner: 'platform-team',
      });
      expect(result.content[0].text).toContain('AuthService');
      expect(result.content[0].text).toContain('User');
    });

    it('returns no-results for unknown owner', async () => {
      const result = await callTool(server, 'find_code_by_owner', {
        owner: 'unknown',
      });
      expect(result.content[0].text).toContain('No entities found');
    });
  });

  describe('find_code_by_business_goal', () => {
    it('returns entities matching a business goal', async () => {
      const result = await callTool(server, 'find_code_by_business_goal', {
        goal: 'revenue',
      });
      expect(result.content[0].text).toContain('processPayment');
    });
  });

  describe('get_code_dependencies', () => {
    it('returns dependencies for an entity', async () => {
      const result = await callTool(server, 'get_code_dependencies', {
        entity_id: 'payment-processor',
      });
      expect(result.content[0].text).toContain('auth-service');
      expect(result.content[0].text).toContain('logger-util');
    });

    it('reports no dependencies for isolated entity', async () => {
      const result = await callTool(server, 'get_code_dependencies', {
        entity_id: 'nonexistent',
      });
      expect(result.content[0].text).toContain('No dependencies found');
    });
  });

  describe('get_entity_details', () => {
    it('returns full metadata for an entity', async () => {
      const result = await callTool(server, 'get_entity_details', {
        entity_id: 'auth-service',
      });
      const text = result.content[0].text;
      expect(text).toContain('AuthService');
      expect(text).toContain('service');
      expect(text).toContain('platform-team');
      expect(text).toContain('Auth Design Doc');
    });

    it('returns error for missing entity', async () => {
      const result = await callTool(server, 'get_entity_details', {
        entity_id: 'nonexistent',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Entity not found');
    });
  });

  describe('get_external_knowledge', () => {
    it('returns all links when no entity specified', async () => {
      const result = await callTool(server, 'get_external_knowledge', {});
      expect(result.content[0].text).toContain('notion.so');
      expect(result.content[0].text).toContain('confluence.example.com');
    });

    it('returns links for a specific entity', async () => {
      const result = await callTool(server, 'get_external_knowledge', {
        entity_id: 'auth-service',
      });
      expect(result.content[0].text).toContain('notion.so');
      expect(result.content[0].text).toContain('jira.example.com');
    });

    it('filters links by type', async () => {
      const result = await callTool(server, 'get_external_knowledge', {
        type: 'notion',
      });
      expect(result.content[0].text).toContain('notion.so');
      expect(result.content[0].text).not.toContain('confluence');
    });
  });

  describe('get_graph_overview', () => {
    it('returns codebase statistics', async () => {
      const result = await callTool(server, 'get_graph_overview', {});
      const text = result.content[0].text;
      expect(text).toContain('Total Entities');
      expect(text).toContain('4');
      expect(text).toContain('platform-team');
      expect(text).toContain('typescript');
    });
  });
});
