import type { DatabaseManager } from '../indexer/database.js';
import type { EntityType, Link, Status } from '../types/index.js';
import type { IndexStats, StoredEntity } from '../indexer/types.js';

export interface QueryOptions {
  readonly query?: string;
  readonly type?: EntityType;
  readonly owner?: string;
  readonly status?: Status;
  readonly tags?: readonly string[];
  readonly filePath?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export interface QueryResult {
  readonly entities: readonly StoredEntity[];
  readonly total: number;
  readonly query: QueryOptions;
}

export interface QueryEngine {
  search(options: QueryOptions): QueryResult;
  getEntity(id: string): StoredEntity | undefined;
  getDependencies(entityId: string): readonly StoredEntity[];
  getDependents(entityId: string): readonly StoredEntity[];
  getByOwner(owner: string): readonly StoredEntity[];
  getByTag(tag: string): readonly StoredEntity[];
  getStats(): IndexStats;
}

interface EntityRow {
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
}

interface TagRow {
  readonly tag: string;
}

interface LinkRow {
  readonly link_type: string | null;
  readonly url: string;
  readonly title: string | null;
}

interface CountRow {
  readonly count: number;
}

function rowToStoredEntity(
  row: EntityRow,
  tags: readonly string[],
  links: readonly Link[],
): StoredEntity {
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
}

function hydrateEntity(
  db: DatabaseManager['db'],
  row: EntityRow,
): StoredEntity {
  const tags = (
    db
      .prepare('SELECT tag FROM tags WHERE entity_id = ?')
      .all(row.id) as readonly TagRow[]
  ).map((r) => r.tag);
  const links = (
    db
      .prepare('SELECT link_type, url, title FROM links WHERE entity_id = ?')
      .all(row.id) as readonly LinkRow[]
  ).map((r) => ({
    type: r.link_type as Link['type'],
    url: r.url,
    title: r.title ?? undefined,
  }));
  return rowToStoredEntity(row, tags, links);
}

export function createQueryEngine(dbManager: DatabaseManager): QueryEngine {
  const { db } = dbManager;

  function search(options: QueryOptions): QueryResult {
    const {
      query,
      type,
      owner,
      status,
      tags,
      filePath,
      limit = 50,
      offset = 0,
    } = options;

    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (query) {
      conditions.push(
        `e.id IN (SELECT entity_id FROM entities_fts WHERE entities_fts MATCH @query)`,
      );
      params.query = query;
    }

    if (type) {
      conditions.push('e.entity_type = @type');
      params.type = type;
    }

    if (owner) {
      conditions.push('e.owner = @owner');
      params.owner = owner;
    }

    if (status) {
      conditions.push('e.status = @status');
      params.status = status;
    }

    if (filePath) {
      conditions.push('e.file_path = @filePath');
      params.filePath = filePath;
    }

    if (tags && tags.length > 0) {
      const tagPlaceholders = tags.map((_, i) => `@tag${i}`);
      conditions.push(
        `e.id IN (SELECT entity_id FROM tags WHERE tag IN (${tagPlaceholders.join(', ')}))`,
      );
      for (let i = 0; i < tags.length; i++) {
        params[`tag${i}`] = tags[i];
      }
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as count FROM entities e ${whereClause}`;
    const total = (db.prepare(countSql).get(params) as CountRow).count;

    const dataSql = `SELECT e.* FROM entities e ${whereClause} ORDER BY e.name ASC LIMIT @limit OFFSET @offset`;
    params.limit = limit;
    params.offset = offset;
    const rows = db.prepare(dataSql).all(params) as readonly EntityRow[];

    const entities = rows.map((row) => hydrateEntity(db, row));

    return { entities, total, query: options };
  }

  function getEntity(id: string): StoredEntity | undefined {
    return dbManager.getEntityById(id);
  }

  function getDependencies(entityId: string): readonly StoredEntity[] {
    const rows = db
      .prepare(
        `SELECT e.* FROM entities e
       JOIN relationships r ON e.id = r.target_id
       WHERE r.source_id = ?`,
      )
      .all(entityId) as readonly EntityRow[];
    return rows.map((row) => hydrateEntity(db, row));
  }

  function getDependents(entityId: string): readonly StoredEntity[] {
    const rows = db
      .prepare(
        `SELECT e.* FROM entities e
       JOIN relationships r ON e.id = r.source_id
       WHERE r.target_id = ?`,
      )
      .all(entityId) as readonly EntityRow[];
    return rows.map((row) => hydrateEntity(db, row));
  }

  function getByOwner(owner: string): readonly StoredEntity[] {
    const rows = db
      .prepare('SELECT * FROM entities WHERE owner = ?')
      .all(owner) as readonly EntityRow[];
    return rows.map((row) => hydrateEntity(db, row));
  }

  function getByTag(tag: string): readonly StoredEntity[] {
    const rows = db
      .prepare(
        `SELECT e.* FROM entities e
       JOIN tags t ON e.id = t.entity_id
       WHERE t.tag = ?`,
      )
      .all(tag) as readonly EntityRow[];
    return rows.map((row) => hydrateEntity(db, row));
  }

  function getStats(): IndexStats {
    return dbManager.getStats();
  }

  return {
    search,
    getEntity,
    getDependencies,
    getDependents,
    getByOwner,
    getByTag,
    getStats,
  };
}
