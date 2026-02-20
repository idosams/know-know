/**
 * @knowgraph
 * type: module
 * description: Jira connector that syncs issue metadata into entity links via the Jira REST API
 * owner: knowgraph-core
 * status: experimental
 * tags: [connector, jira, api, sync]
 * context:
 *   business_goal: Enrich code entities with linked Jira issue metadata
 *   domain: connectors
 */
import type { ConnectorConfig } from '../types/manifest.js';
import type { Link } from '../types/entity.js';
import type { DatabaseManager } from '../indexer/database.js';
import type { StoredEntity } from '../indexer/types.js';
import type {
  Connector,
  ConnectorSyncOptions,
  ConnectorSyncResult,
  ConnectorValidationResult,
  ConnectorError,
} from './types.js';
import type { ConnectorCache } from './cache.js';
import type { RateLimiter } from './rate-limiter.js';
import { createCache } from './cache.js';
import { createRateLimiter } from './rate-limiter.js';

// --- Jira API Types ---

export interface JiraIssue {
  readonly key: string;
  readonly url: string;
  readonly summary: string;
  readonly status: string;
  readonly assignee?: string;
  readonly priority?: string;
  readonly lastUpdated: string;
}

export interface JiraApiClient {
  getIssue(issueKey: string): Promise<JiraIssue>;
  searchIssues(jql: string): Promise<readonly JiraIssue[]>;
}

// --- Jira URL Utilities ---

const JIRA_ISSUE_PATTERN = /\/browse\/([A-Z][A-Z0-9_]+-\d+)/;
const JIRA_URL_PATTERN =
  /^https?:\/\/[^/]+\.(atlassian\.net|jira\.[^/]+)\/browse\//;

export function isJiraUrl(url: string): boolean {
  return JIRA_URL_PATTERN.test(url);
}

export function extractJiraIssueKey(url: string): string | undefined {
  const match = url.match(JIRA_ISSUE_PATTERN);
  return match?.[1];
}

// --- Fetch-based Jira API Client ---

export function createJiraApiClient(
  baseUrl: string,
  apiKey: string,
  email?: string,
): JiraApiClient {
  const apiBase = baseUrl.replace(/\/$/, '');
  const authHeader = email
    ? `Basic ${Buffer.from(`${email}:${apiKey}`).toString('base64')}`
    : `Bearer ${apiKey}`;

  const headers = {
    Authorization: authHeader,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  function parseIssue(
    data: Record<string, unknown>,
    issueBaseUrl: string,
  ): JiraIssue {
    const fields = data.fields as Record<string, unknown>;
    const status = fields.status as { name: string } | undefined;
    const assignee = fields.assignee as { displayName: string } | null;
    const priority = fields.priority as { name: string } | null;

    return {
      key: data.key as string,
      url: `${issueBaseUrl}/browse/${data.key as string}`,
      summary: (fields.summary as string) ?? '',
      status: status?.name ?? 'Unknown',
      assignee: assignee?.displayName,
      priority: priority?.name,
      lastUpdated: (fields.updated as string) ?? '',
    };
  }

  return {
    async getIssue(issueKey: string): Promise<JiraIssue> {
      const response = await fetch(
        `${apiBase}/rest/api/3/issue/${issueKey}?fields=summary,status,assignee,priority,updated`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(
          `Jira API error: ${response.status} ${response.statusText}`,
        );
      }
      const data = (await response.json()) as Record<string, unknown>;
      return parseIssue(data, apiBase);
    },

    async searchIssues(jql: string): Promise<readonly JiraIssue[]> {
      const response = await fetch(`${apiBase}/rest/api/3/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jql,
          maxResults: 10,
          fields: ['summary', 'status', 'assignee', 'priority', 'updated'],
        }),
      });
      if (!response.ok) {
        throw new Error(
          `Jira API error: ${response.status} ${response.statusText}`,
        );
      }
      const data = (await response.json()) as {
        issues: ReadonlyArray<Record<string, unknown>>;
      };
      return data.issues.map((issue) => parseIssue(issue, apiBase));
    },
  };
}

// --- Jira Connector ---

export interface JiraConnectorDeps {
  readonly apiClient?: JiraApiClient;
  readonly cache?: ConnectorCache<JiraIssue>;
  readonly rateLimiter?: RateLimiter;
}

function getAllEntities(dbManager: DatabaseManager): readonly StoredEntity[] {
  const rows = dbManager.db
    .prepare('SELECT * FROM entities ORDER BY name ASC')
    .all() as ReadonlyArray<{
    readonly id: string;
    readonly file_path: string;
    readonly name: string;
    readonly entity_type: string;
    readonly description: string;
    readonly raw_docstring: string | null;
    readonly signature: string | null;
    readonly parent: string | null;
    readonly language: string;
    readonly line: number;
    readonly column_num: number;
    readonly owner: string | null;
    readonly status: string | null;
    readonly metadata_json: string;
    readonly file_hash: string | null;
    readonly created_at: string;
    readonly updated_at: string;
  }>;

  return rows.map((row) => {
    const tags = (
      dbManager.db
        .prepare('SELECT tag FROM tags WHERE entity_id = ?')
        .all(row.id) as ReadonlyArray<{ tag: string }>
    ).map((t) => t.tag);

    const links = (
      dbManager.db
        .prepare('SELECT link_type, url, title FROM links WHERE entity_id = ?')
        .all(row.id) as ReadonlyArray<{
        link_type: string | null;
        url: string;
        title: string | null;
      }>
    ).map((l) => ({
      type: l.link_type as Link['type'],
      url: l.url,
      title: l.title ?? undefined,
    }));

    return {
      id: row.id,
      filePath: row.file_path,
      name: row.name,
      entityType: row.entity_type as StoredEntity['entityType'],
      description: row.description,
      rawDocstring: row.raw_docstring,
      signature: row.signature,
      parent: row.parent,
      language: row.language,
      line: row.line,
      column: row.column_num,
      owner: row.owner,
      status: row.status as StoredEntity['status'],
      metadata: JSON.parse(row.metadata_json),
      tags,
      links,
      fileHash: row.file_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

function filterEntities(
  entities: readonly StoredEntity[],
  filter?: ConnectorSyncOptions['entityFilter'],
): readonly StoredEntity[] {
  if (!filter) return entities;

  return entities.filter((entity) => {
    if (filter.owner && entity.owner !== filter.owner) return false;
    if (filter.tags && filter.tags.length > 0) {
      const hasMatchingTag = filter.tags.some((t) => entity.tags.includes(t));
      if (!hasMatchingTag) return false;
    }
    return true;
  });
}

export function createJiraConnector(deps: JiraConnectorDeps = {}): Connector {
  const cache = deps.cache ?? createCache<JiraIssue>({ ttlMs: 5 * 60 * 1000 });
  const rateLimiter =
    deps.rateLimiter ??
    createRateLimiter({
      maxTokens: 10,
      refillRate: 10,
      refillIntervalMs: 1000,
    });

  return {
    name: 'jira',
    supportedLinkTypes: ['jira'] as const,

    validate(config: ConnectorConfig): ConnectorValidationResult {
      const issues: Array<{ field: string; message: string }> = [];

      if (!config.base_url) {
        issues.push({
          field: 'base_url',
          message: 'base_url is required (Jira instance URL)',
        });
      }

      if (!config.api_key_env) {
        issues.push({
          field: 'api_key_env',
          message:
            'api_key_env is required (env variable name for Jira API key)',
        });
      } else if (!process.env[config.api_key_env]) {
        issues.push({
          field: 'api_key_env',
          message: `Environment variable "${config.api_key_env}" is not set`,
        });
      }

      return { valid: issues.length === 0, issues };
    },

    async sync(options: ConnectorSyncOptions): Promise<ConnectorSyncResult> {
      const startTime = Date.now();
      const { dbManager, config, entityFilter, dryRun } = options;
      const errors: ConnectorError[] = [];
      const linksAdded = 0;
      let linksUpdated = 0;

      const apiKey = config.api_key_env
        ? process.env[config.api_key_env]
        : undefined;

      if (!apiKey || !config.base_url) {
        return {
          connector: 'jira',
          entitiesProcessed: 0,
          linksAdded: 0,
          linksUpdated: 0,
          errors: [
            {
              entityId: '',
              message: 'Jira API key or base URL not configured',
              code: 'AUTH_MISSING',
            },
          ],
          duration: Date.now() - startTime,
        };
      }

      const apiClient =
        deps.apiClient ?? createJiraApiClient(config.base_url, apiKey);
      const allEntities = getAllEntities(dbManager);
      const entities = filterEntities(allEntities, entityFilter);

      for (const entity of entities) {
        const jiraLinks = entity.links.filter(
          (l) => l.type === 'jira' || (l.url && isJiraUrl(l.url)),
        );

        for (const link of jiraLinks) {
          const issueKey = extractJiraIssueKey(link.url);
          if (!issueKey) continue;

          try {
            const cached = cache.get(issueKey);
            let issue: JiraIssue;

            if (cached) {
              issue = cached;
            } else {
              await rateLimiter.acquire();
              issue = await apiClient.getIssue(issueKey);
              cache.set(issueKey, issue);
            }

            const title = `[${issue.status}] ${issue.summary}`;

            if (!dryRun) {
              dbManager.db
                .prepare('DELETE FROM links WHERE entity_id = ? AND url = ?')
                .run(entity.id, link.url);
              dbManager.insertLinks(entity.id, [
                {
                  type: 'jira',
                  url: link.url,
                  title,
                },
              ]);
              linksUpdated++;
            } else {
              linksUpdated++;
            }
          } catch (err) {
            errors.push({
              entityId: entity.id,
              message: `Failed to fetch Jira issue ${issueKey}: ${err instanceof Error ? err.message : String(err)}`,
              code: 'FETCH_ERROR',
            });
          }
        }
      }

      return {
        connector: 'jira',
        entitiesProcessed: entities.length,
        linksAdded,
        linksUpdated,
        errors,
        duration: Date.now() - startTime,
      };
    },
  };
}
