/**
 * @knowgraph
 * type: module
 * description: Notion connector that syncs page metadata into entity links via the Notion API
 * owner: knowgraph-core
 * status: experimental
 * tags: [connector, notion, api, sync]
 * context:
 *   business_goal: Enrich code entities with linked Notion page metadata
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

// --- Notion API Types ---

export interface NotionPage {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly lastEditedTime: string;
  readonly status?: string;
}

export interface NotionApiClient {
  getPage(pageId: string): Promise<NotionPage>;
  searchPages(query: string): Promise<readonly NotionPage[]>;
}

// --- Notion URL Utilities ---

const NOTION_URL_PATTERN = /^https?:\/\/(www\.)?notion\.(so|site)\//;
const NOTION_PAGE_ID_PATTERN = /([a-f0-9]{32}|[a-f0-9-]{36})(?:\?|$)/;

export function isNotionUrl(url: string): boolean {
  return NOTION_URL_PATTERN.test(url);
}

export function extractNotionPageId(url: string): string | undefined {
  const match = url.match(NOTION_PAGE_ID_PATTERN);
  if (!match) return undefined;
  return match[1].replace(/-/g, '');
}

// --- Fetch-based Notion API Client ---

export function createNotionApiClient(apiKey: string): NotionApiClient {
  const baseUrl = 'https://api.notion.com/v1';
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  function extractTitle(page: Record<string, unknown>): string {
    const properties = page.properties as Record<string, unknown> | undefined;
    if (!properties) return 'Untitled';

    for (const value of Object.values(properties)) {
      const prop = value as Record<string, unknown>;
      if (prop.type === 'title') {
        const titleArray = prop.title as ReadonlyArray<{ plain_text: string }>;
        if (titleArray && titleArray.length > 0) {
          return titleArray.map((t) => t.plain_text).join('');
        }
      }
    }
    return 'Untitled';
  }

  function extractStatus(page: Record<string, unknown>): string | undefined {
    const properties = page.properties as Record<string, unknown> | undefined;
    if (!properties) return undefined;

    const status = properties['Status'] as Record<string, unknown> | undefined;
    if (status?.type === 'status') {
      const statusValue = status.status as { name: string } | null;
      return statusValue?.name;
    }
    return undefined;
  }

  return {
    async getPage(pageId: string): Promise<NotionPage> {
      const response = await fetch(`${baseUrl}/pages/${pageId}`, { headers });
      if (!response.ok) {
        throw new Error(
          `Notion API error: ${response.status} ${response.statusText}`,
        );
      }
      const data = (await response.json()) as Record<string, unknown>;
      return {
        id: data.id as string,
        url: data.url as string,
        title: extractTitle(data),
        lastEditedTime: data.last_edited_time as string,
        status: extractStatus(data),
      };
    },

    async searchPages(query: string): Promise<readonly NotionPage[]> {
      const response = await fetch(`${baseUrl}/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          filter: { value: 'page', property: 'object' },
          page_size: 10,
        }),
      });
      if (!response.ok) {
        throw new Error(
          `Notion API error: ${response.status} ${response.statusText}`,
        );
      }
      const data = (await response.json()) as {
        results: ReadonlyArray<Record<string, unknown>>;
      };
      return data.results.map((page) => ({
        id: page.id as string,
        url: page.url as string,
        title: extractTitle(page),
        lastEditedTime: page.last_edited_time as string,
        status: extractStatus(page),
      }));
    },
  };
}

// --- Notion Connector ---

export interface NotionConnectorDeps {
  readonly apiClient?: NotionApiClient;
  readonly cache?: ConnectorCache<NotionPage>;
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
        .prepare(
          'SELECT link_type, url, title FROM links WHERE entity_id = ?',
        )
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

export function createNotionConnector(deps: NotionConnectorDeps = {}): Connector {
  const cache =
    deps.cache ?? createCache<NotionPage>({ ttlMs: 5 * 60 * 1000 });
  const rateLimiter =
    deps.rateLimiter ??
    createRateLimiter({ maxTokens: 3, refillRate: 3, refillIntervalMs: 1000 });

  return {
    name: 'notion',
    supportedLinkTypes: ['notion'] as const,

    validate(config: ConnectorConfig): ConnectorValidationResult {
      const issues: Array<{ field: string; message: string }> = [];

      if (!config.api_key_env) {
        issues.push({
          field: 'api_key_env',
          message:
            'api_key_env is required (env variable name for Notion API key)',
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
      let linksAdded = 0;
      let linksUpdated = 0;

      const apiKey = config.api_key_env
        ? process.env[config.api_key_env]
        : undefined;

      if (!apiKey) {
        return {
          connector: 'notion',
          entitiesProcessed: 0,
          linksAdded: 0,
          linksUpdated: 0,
          errors: [
            {
              entityId: '',
              message: 'Notion API key not found in environment',
              code: 'AUTH_MISSING',
            },
          ],
          duration: Date.now() - startTime,
        };
      }

      const apiClient = deps.apiClient ?? createNotionApiClient(apiKey);
      const allEntities = getAllEntities(dbManager);
      const entities = filterEntities(allEntities, entityFilter);

      for (const entity of entities) {
        const notionLinks = entity.links.filter(
          (l) => l.type === 'notion' || (l.url && isNotionUrl(l.url)),
        );

        for (const link of notionLinks) {
          const pageId = extractNotionPageId(link.url);
          if (!pageId) continue;

          try {
            const cached = cache.get(pageId);
            let page: NotionPage;

            if (cached) {
              page = cached;
            } else {
              await rateLimiter.acquire();
              page = await apiClient.getPage(pageId);
              cache.set(pageId, page);
            }

            if (!dryRun) {
              // Delete old link and insert updated one
              dbManager.db
                .prepare(
                  'DELETE FROM links WHERE entity_id = ? AND url = ?',
                )
                .run(entity.id, link.url);
              dbManager.insertLinks(entity.id, [
                {
                  type: 'notion',
                  url: link.url,
                  title: page.title,
                },
              ]);
              linksUpdated++;
            } else {
              linksUpdated++;
            }
          } catch (err) {
            errors.push({
              entityId: entity.id,
              message: `Failed to fetch Notion page ${pageId}: ${err instanceof Error ? err.message : String(err)}`,
              code: 'FETCH_ERROR',
            });
          }
        }
      }

      return {
        connector: 'notion',
        entitiesProcessed: entities.length,
        linksAdded,
        linksUpdated,
        errors,
        duration: Date.now() - startTime,
      };
    },
  };
}
