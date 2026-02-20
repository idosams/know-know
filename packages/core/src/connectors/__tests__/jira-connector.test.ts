import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createJiraConnector,
  isJiraUrl,
  extractJiraIssueKey,
} from '../jira-connector.js';
import type { JiraApiClient, JiraIssue } from '../jira-connector.js';
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
    api_key_env: 'JIRA_API_KEY',
    base_url: 'https://myteam.atlassian.net',
    ...overrides,
  };
}

function makeMockApiClient(
  issues: Record<string, JiraIssue> = {},
): JiraApiClient {
  return {
    getIssue: vi.fn(async (issueKey: string) => {
      const issue = issues[issueKey];
      if (!issue) throw new Error(`Issue not found: ${issueKey}`);
      return issue;
    }),
    searchIssues: vi.fn(async () => []),
  };
}

describe('Jira URL utilities', () => {
  describe('isJiraUrl', () => {
    it('recognizes Atlassian Cloud URLs', () => {
      expect(isJiraUrl('https://myteam.atlassian.net/browse/PROJ-123')).toBe(
        true,
      );
    });

    it('recognizes self-hosted Jira URLs', () => {
      expect(
        isJiraUrl('https://jira.example.com/jira.example.com/browse/PROJ-1'),
      ).toBe(false); // doesn't match the pattern
      expect(isJiraUrl('https://myteam.jira.example.com/browse/PROJ-1')).toBe(
        true,
      );
    });

    it('rejects non-Jira URLs', () => {
      expect(isJiraUrl('https://example.com/browse/PROJ-1')).toBe(false);
      expect(isJiraUrl('https://notion.so/page')).toBe(false);
    });
  });

  describe('extractJiraIssueKey', () => {
    it('extracts issue key from standard URL', () => {
      expect(
        extractJiraIssueKey('https://myteam.atlassian.net/browse/PROJ-123'),
      ).toBe('PROJ-123');
    });

    it('extracts issue key with complex project prefix', () => {
      expect(
        extractJiraIssueKey('https://myteam.atlassian.net/browse/MY_PROJ-42'),
      ).toBe('MY_PROJ-42');
    });

    it('returns undefined for URLs without issue key', () => {
      expect(
        extractJiraIssueKey('https://myteam.atlassian.net/browse/'),
      ).toBeUndefined();
    });
  });
});

describe('JiraConnector', () => {
  let dbManager: DatabaseManager;

  beforeEach(() => {
    dbManager = createDatabaseManager();
    dbManager.initialize();
    vi.stubEnv('JIRA_API_KEY', 'test-jira-key');
  });

  afterEach(() => {
    dbManager.close();
    vi.unstubAllEnvs();
  });

  describe('validate', () => {
    it('passes with valid config and env var set', () => {
      const connector = createJiraConnector();
      const result = connector.validate(makeConfig());
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('fails when base_url is missing', () => {
      const connector = createJiraConnector();
      const result = connector.validate(makeConfig({ base_url: undefined }));
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.field === 'base_url')).toBe(true);
    });

    it('fails when api_key_env is missing', () => {
      const connector = createJiraConnector();
      const result = connector.validate(makeConfig({ api_key_env: undefined }));
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.field === 'api_key_env')).toBe(true);
    });

    it('fails when env var is not set', () => {
      delete process.env['JIRA_API_KEY'];
      const connector = createJiraConnector();
      const result = connector.validate(makeConfig());
      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('not set');
    });
  });

  describe('sync', () => {
    it('enriches Jira links with issue metadata', async () => {
      const issueKey = 'PROJ-123';
      const jiraUrl = `https://myteam.atlassian.net/browse/${issueKey}`;
      const links: readonly Link[] = [
        { type: 'jira', url: jiraUrl, title: 'Old Title' },
      ];

      dbManager.insertEntity(makeEntity({ links }));

      const mockIssue: JiraIssue = {
        key: issueKey,
        url: jiraUrl,
        summary: 'Fix login bug',
        status: 'In Progress',
        assignee: 'John Doe',
        priority: 'High',
        lastUpdated: '2026-02-20T00:00:00Z',
      };

      const connector = createJiraConnector({
        apiClient: makeMockApiClient({ [issueKey]: mockIssue }),
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

      expect(result.connector).toBe('jira');
      expect(result.entitiesProcessed).toBe(1);
      expect(result.linksUpdated).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify the link was updated with status + summary
      const entity = dbManager.db
        .prepare('SELECT id FROM entities LIMIT 1')
        .get() as { id: string };
      const updatedLinks = dbManager.db
        .prepare('SELECT title FROM links WHERE entity_id = ?')
        .all(entity.id) as ReadonlyArray<{ title: string | null }>;
      expect(updatedLinks[0].title).toBe('[In Progress] Fix login bug');
    });

    it('skips entities without Jira links', async () => {
      const links: readonly Link[] = [
        { type: 'notion', url: 'https://notion.so/page', title: 'Page' },
      ];
      dbManager.insertEntity(makeEntity({ links }));

      const apiClient = makeMockApiClient();
      const connector = createJiraConnector({ apiClient });

      const result = await connector.sync({
        dbManager,
        config: makeConfig(),
        dryRun: false,
      });

      expect(result.entitiesProcessed).toBe(1);
      expect(result.linksUpdated).toBe(0);
      expect(apiClient.getIssue).not.toHaveBeenCalled();
    });

    it('respects dry-run mode', async () => {
      const issueKey = 'PROJ-456';
      const jiraUrl = `https://myteam.atlassian.net/browse/${issueKey}`;
      dbManager.insertEntity(
        makeEntity({
          links: [{ type: 'jira', url: jiraUrl }],
        }),
      );

      const connector = createJiraConnector({
        apiClient: makeMockApiClient({
          [issueKey]: {
            key: issueKey,
            url: jiraUrl,
            summary: 'Test issue',
            status: 'Done',
            lastUpdated: '2026-01-01T00:00:00Z',
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

      // Verify link was NOT actually modified
      const entity = dbManager.db
        .prepare('SELECT id FROM entities LIMIT 1')
        .get() as { id: string };
      const links = dbManager.db
        .prepare('SELECT title FROM links WHERE entity_id = ?')
        .all(entity.id) as ReadonlyArray<{ title: string | null }>;
      expect(links[0]?.title).toBeNull();
    });

    it('filters entities by owner', async () => {
      const issueKey = 'PROJ-789';
      dbManager.insertEntity(
        makeEntity({
          name: 'owned',
          line: 1,
          owner: 'team-a',
          links: [
            {
              type: 'jira',
              url: `https://myteam.atlassian.net/browse/${issueKey}`,
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
              type: 'jira',
              url: 'https://myteam.atlassian.net/browse/OTHER-1',
            },
          ],
        }),
      );

      const connector = createJiraConnector({
        apiClient: makeMockApiClient({
          [issueKey]: {
            key: issueKey,
            url: `https://myteam.atlassian.net/browse/${issueKey}`,
            summary: 'Test',
            status: 'Open',
            lastUpdated: '2026-01-01T00:00:00Z',
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
      const issueKey = 'PROJ-999';
      dbManager.insertEntity(
        makeEntity({
          links: [
            {
              type: 'jira',
              url: `https://myteam.atlassian.net/browse/${issueKey}`,
            },
          ],
        }),
      );

      const apiClient: JiraApiClient = {
        getIssue: vi
          .fn()
          .mockRejectedValue(new Error('Jira API error: 403 Forbidden')),
        searchIssues: vi.fn().mockResolvedValue([]),
      };

      const connector = createJiraConnector({
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
      expect(result.errors[0].message).toContain('403 Forbidden');
    });

    it('returns auth error when API key is missing', async () => {
      delete process.env['JIRA_API_KEY'];

      const connector = createJiraConnector();
      const result = await connector.sync({
        dbManager,
        config: makeConfig(),
        dryRun: false,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('AUTH_MISSING');
    });

    it('uses cache for repeated issue lookups', async () => {
      const issueKey = 'PROJ-888';
      const jiraUrl = `https://myteam.atlassian.net/browse/${issueKey}`;

      dbManager.insertEntity(
        makeEntity({
          name: 'func1',
          line: 1,
          links: [{ type: 'jira', url: jiraUrl }],
        }),
      );
      dbManager.insertEntity(
        makeEntity({
          name: 'func2',
          line: 2,
          links: [{ type: 'jira', url: jiraUrl }],
        }),
      );

      const apiClient = makeMockApiClient({
        [issueKey]: {
          key: issueKey,
          url: jiraUrl,
          summary: 'Cached Issue',
          status: 'Open',
          lastUpdated: '2026-01-01T00:00:00Z',
        },
      });

      const connector = createJiraConnector({
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
      expect(apiClient.getIssue).toHaveBeenCalledTimes(1);
    });
  });

  describe('properties', () => {
    it('has correct name', () => {
      const connector = createJiraConnector();
      expect(connector.name).toBe('jira');
    });

    it('supports jira link type', () => {
      const connector = createJiraConnector();
      expect(connector.supportedLinkTypes).toContain('jira');
    });
  });
});
