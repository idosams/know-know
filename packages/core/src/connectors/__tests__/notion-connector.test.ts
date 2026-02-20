import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createNotionConnector,
  isNotionUrl,
  extractNotionPageId,
} from '../notion-connector.js';
import type { NotionApiClient, NotionPage } from '../notion-connector.js';
import type { ConnectorConfig } from '../../types/manifest.js';
import { createDatabaseManager } from '../../indexer/database.js';
import type { DatabaseManager } from '../../indexer/database.js';
import type { CoreMetadata, Link } from '../../types/index.js';
import type { EntityInsert } from '../../indexer/types.js';
import { createCache } from '../cache.js';
import { createRateLimiter } from '../rate-limiter.js';

function makeEntity(overrides: Partial<EntityInsert> = {}): EntityInsert {
  const metadata: CoreMetadata = {
    type: 'function',
    description: 'Test function',
    owner: 'test-team',
    status: 'stable',
    tags: ['test'],
  };

  return {
    filePath: 'src/test.ts',
    name: 'testFunction',
    entityType: 'function',
    description: 'Test function',
    language: 'typescript',
    line: 1,
    column: 0,
    owner: 'test-team',
    status: 'stable',
    metadata,
    tags: ['test'],
    links: [],
    ...overrides,
  };
}

function makeConfig(overrides: Partial<ConnectorConfig> = {}): ConnectorConfig {
  return {
    enabled: true,
    api_key_env: 'NOTION_API_KEY',
    ...overrides,
  };
}

function makeMockApiClient(
  pages: Record<string, NotionPage> = {},
): NotionApiClient {
  return {
    getPage: vi.fn(async (pageId: string) => {
      const page = pages[pageId];
      if (!page) throw new Error(`Page not found: ${pageId}`);
      return page;
    }),
    searchPages: vi.fn(async () => []),
  };
}

describe('Notion URL utilities', () => {
  describe('isNotionUrl', () => {
    it('recognizes notion.so URLs', () => {
      expect(isNotionUrl('https://notion.so/my-page-abc123')).toBe(true);
    });

    it('recognizes www.notion.so URLs', () => {
      expect(isNotionUrl('https://www.notion.so/my-page')).toBe(true);
    });

    it('recognizes notion.site URLs', () => {
      expect(isNotionUrl('https://notion.site/my-page')).toBe(true);
    });

    it('rejects non-Notion URLs', () => {
      expect(isNotionUrl('https://example.com/page')).toBe(false);
      expect(isNotionUrl('https://jira.example.com/issue')).toBe(false);
    });
  });

  describe('extractNotionPageId', () => {
    it('extracts 32-char hex page ID from URL', () => {
      const url =
        'https://notion.so/My-Page-abcdef1234567890abcdef1234567890';
      expect(extractNotionPageId(url)).toBe(
        'abcdef1234567890abcdef1234567890',
      );
    });

    it('extracts UUID-format page ID', () => {
      const url =
        'https://notion.so/page-abcdef12-3456-7890-abcd-ef1234567890';
      expect(extractNotionPageId(url)).toBe(
        'abcdef1234567890abcdef1234567890',
      );
    });

    it('returns undefined for URLs without page ID', () => {
      expect(extractNotionPageId('https://notion.so/')).toBeUndefined();
    });
  });
});

describe('NotionConnector', () => {
  let dbManager: DatabaseManager;

  beforeEach(() => {
    dbManager = createDatabaseManager();
    dbManager.initialize();
    vi.stubEnv('NOTION_API_KEY', 'test-api-key');
  });

  afterEach(() => {
    dbManager.close();
    vi.unstubAllEnvs();
  });

  describe('validate', () => {
    it('passes with valid config and env var set', () => {
      const connector = createNotionConnector();
      const result = connector.validate(makeConfig());
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('fails when api_key_env is missing', () => {
      const connector = createNotionConnector();
      const result = connector.validate(
        makeConfig({ api_key_env: undefined }),
      );
      expect(result.valid).toBe(false);
      expect(result.issues[0].field).toBe('api_key_env');
    });

    it('fails when env var is not set', () => {
      vi.stubEnv('NOTION_API_KEY', '');
      const connector = createNotionConnector();
      // Need to unset the env var entirely
      delete process.env['NOTION_API_KEY'];
      const result = connector.validate(makeConfig());
      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('not set');
    });
  });

  describe('sync', () => {
    it('enriches Notion links with page metadata', async () => {
      const pageId = 'abcdef1234567890abcdef1234567890';
      const notionUrl = `https://notion.so/My-Page-${pageId}`;
      const links: readonly Link[] = [
        { type: 'notion', url: notionUrl, title: 'Old Title' },
      ];

      dbManager.insertEntity(makeEntity({ links }));

      const mockPage: NotionPage = {
        id: pageId,
        url: notionUrl,
        title: 'Updated Page Title',
        lastEditedTime: '2026-02-20T00:00:00Z',
        status: 'Done',
      };

      const connector = createNotionConnector({
        apiClient: makeMockApiClient({ [pageId]: mockPage }),
        cache: createCache({ ttlMs: 5000 }),
        rateLimiter: createRateLimiter({
          maxTokens: 10,
          refillRate: 10,
          refillIntervalMs: 1000,
        }),
      });

      const result = await connector.sync({
        dbManager,
        config: makeConfig(),
        dryRun: false,
      });

      expect(result.connector).toBe('notion');
      expect(result.entitiesProcessed).toBe(1);
      expect(result.linksUpdated).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('skips entities without Notion links', async () => {
      const links: readonly Link[] = [
        { type: 'github', url: 'https://github.com/repo', title: 'Repo' },
      ];
      dbManager.insertEntity(makeEntity({ links }));

      const apiClient = makeMockApiClient();
      const connector = createNotionConnector({ apiClient });

      const result = await connector.sync({
        dbManager,
        config: makeConfig(),
        dryRun: false,
      });

      expect(result.entitiesProcessed).toBe(1);
      expect(result.linksUpdated).toBe(0);
      expect(apiClient.getPage).not.toHaveBeenCalled();
    });

    it('respects dry-run mode', async () => {
      const pageId = 'abcdef1234567890abcdef1234567890';
      const notionUrl = `https://notion.so/Page-${pageId}`;
      dbManager.insertEntity(
        makeEntity({
          links: [{ type: 'notion', url: notionUrl }],
        }),
      );

      const connector = createNotionConnector({
        apiClient: makeMockApiClient({
          [pageId]: {
            id: pageId,
            url: notionUrl,
            title: 'Test',
            lastEditedTime: '2026-01-01T00:00:00Z',
          },
        }),
        cache: createCache({ ttlMs: 5000 }),
        rateLimiter: createRateLimiter({
          maxTokens: 10,
          refillRate: 10,
          refillIntervalMs: 1000,
        }),
      });

      const result = await connector.sync({
        dbManager,
        config: makeConfig(),
        dryRun: true,
      });

      expect(result.linksUpdated).toBe(1);

      // Verify link was NOT actually modified in DB
      const entity = dbManager.db
        .prepare('SELECT id FROM entities LIMIT 1')
        .get() as { id: string };
      const links = dbManager.db
        .prepare('SELECT title FROM links WHERE entity_id = ?')
        .all(entity.id) as ReadonlyArray<{ title: string | null }>;

      // Original link had no title, should remain unchanged
      expect(links[0]?.title).toBeNull();
    });

    it('filters entities by owner', async () => {
      dbManager.insertEntity(
        makeEntity({
          name: 'owned',
          line: 1,
          owner: 'team-a',
          links: [
            {
              type: 'notion',
              url: 'https://notion.so/Page-abcdef1234567890abcdef1234567890',
            },
          ],
        }),
      );
      dbManager.insertEntity(
        makeEntity({
          name: 'other',
          line: 2,
          owner: 'team-b',
          links: [
            {
              type: 'notion',
              url: 'https://notion.so/Page-00000000000000000000000000000000',
            },
          ],
        }),
      );

      const pageId = 'abcdef1234567890abcdef1234567890';
      const connector = createNotionConnector({
        apiClient: makeMockApiClient({
          [pageId]: {
            id: pageId,
            url: `https://notion.so/Page-${pageId}`,
            title: 'Test',
            lastEditedTime: '2026-01-01T00:00:00Z',
          },
        }),
        cache: createCache({ ttlMs: 5000 }),
        rateLimiter: createRateLimiter({
          maxTokens: 10,
          refillRate: 10,
          refillIntervalMs: 1000,
        }),
      });

      const result = await connector.sync({
        dbManager,
        config: makeConfig(),
        entityFilter: { owner: 'team-a' },
        dryRun: true,
      });

      expect(result.entitiesProcessed).toBe(1);
    });

    it('handles API errors gracefully', async () => {
      const pageId = 'abcdef1234567890abcdef1234567890';
      dbManager.insertEntity(
        makeEntity({
          links: [
            {
              type: 'notion',
              url: `https://notion.so/Page-${pageId}`,
            },
          ],
        }),
      );

      const apiClient: NotionApiClient = {
        getPage: vi.fn().mockRejectedValue(new Error('API rate limited')),
        searchPages: vi.fn().mockResolvedValue([]),
      };

      const connector = createNotionConnector({
        apiClient,
        cache: createCache({ ttlMs: 5000 }),
        rateLimiter: createRateLimiter({
          maxTokens: 10,
          refillRate: 10,
          refillIntervalMs: 1000,
        }),
      });

      const result = await connector.sync({
        dbManager,
        config: makeConfig(),
        dryRun: false,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('FETCH_ERROR');
      expect(result.errors[0].message).toContain('API rate limited');
    });

    it('returns auth error when API key is missing', async () => {
      delete process.env['NOTION_API_KEY'];

      const connector = createNotionConnector();
      const result = await connector.sync({
        dbManager,
        config: makeConfig(),
        dryRun: false,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('AUTH_MISSING');
    });

    it('uses cache for repeated page lookups', async () => {
      const pageId = 'abcdef1234567890abcdef1234567890';
      const notionUrl = `https://notion.so/Page-${pageId}`;

      dbManager.insertEntity(
        makeEntity({
          name: 'func1',
          line: 1,
          links: [{ type: 'notion', url: notionUrl }],
        }),
      );
      dbManager.insertEntity(
        makeEntity({
          name: 'func2',
          line: 2,
          links: [{ type: 'notion', url: notionUrl }],
        }),
      );

      const apiClient = makeMockApiClient({
        [pageId]: {
          id: pageId,
          url: notionUrl,
          title: 'Cached Page',
          lastEditedTime: '2026-01-01T00:00:00Z',
        },
      });

      const connector = createNotionConnector({
        apiClient,
        cache: createCache({ ttlMs: 60000 }),
        rateLimiter: createRateLimiter({
          maxTokens: 10,
          refillRate: 10,
          refillIntervalMs: 1000,
        }),
      });

      await connector.sync({
        dbManager,
        config: makeConfig(),
        dryRun: false,
      });

      // API should only be called once due to caching
      expect(apiClient.getPage).toHaveBeenCalledTimes(1);
    });
  });

  describe('properties', () => {
    it('has correct name', () => {
      const connector = createNotionConnector();
      expect(connector.name).toBe('notion');
    });

    it('supports notion link type', () => {
      const connector = createNotionConnector();
      expect(connector.supportedLinkTypes).toContain('notion');
    });
  });
});
