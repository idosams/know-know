/**
 * @knowgraph
 * type: module
 * description: SQLite database manager with CRUD operations for entities, tags, links, and relationships
 * owner: knowgraph-core
 * status: stable
 * tags: [database, sqlite, crud, storage]
 * context:
 *   business_goal: Persist and retrieve code entities with full metadata and relationships
 *   domain: indexer-engine
 */
import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import type { Link } from '../types/index.js';
import {
  CREATE_TABLES_SQL,
  DELETE_FTS_BY_ENTITY_SQL,
  DELETE_FTS_BY_FILE_SQL,
  INSERT_ENTITY_SQL,
  INSERT_FTS_SQL,
  INSERT_LINK_SQL,
  INSERT_RELATIONSHIP_SQL,
  INSERT_TAG_SQL,
  UPDATE_ENTITY_SQL,
} from './schema.js';
import type { EntityInsert, IndexStats, StoredEntity } from './types.js';

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

interface TypeCountRow {
  readonly entity_type: string;
  readonly count: number;
}

interface LangCountRow {
  readonly language: string;
  readonly count: number;
}

export function generateEntityId(
  filePath: string,
  name: string,
  line: number,
): string {
  const raw = `${filePath}:${name}:${line}`;
  return createHash('sha256').update(raw).digest('hex');
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

export interface DatabaseManager {
  readonly db: Database.Database;
  initialize(): void;
  close(): void;
  getEntityById(id: string): StoredEntity | undefined;
  getEntitiesByFilePath(filePath: string): readonly StoredEntity[];
  insertEntity(entity: EntityInsert): string;
  updateEntity(id: string, entity: Partial<EntityInsert>): void;
  deleteEntitiesByFilePath(filePath: string): void;
  insertRelationship(sourceId: string, targetId: string, type: string): void;
  insertTags(entityId: string, tags: readonly string[]): void;
  insertLinks(entityId: string, links: readonly Link[]): void;
  getStats(): IndexStats;
  getFileHash(filePath: string): string | undefined;
}

export function createDatabaseManager(dbPath?: string): DatabaseManager {
  const db = new Database(dbPath ?? ':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  function initialize(): void {
    db.exec(CREATE_TABLES_SQL);
  }

  function close(): void {
    db.close();
  }

  function getTagsForEntity(entityId: string): readonly string[] {
    const rows = db
      .prepare('SELECT tag FROM tags WHERE entity_id = ?')
      .all(entityId) as readonly TagRow[];
    return rows.map((r) => r.tag);
  }

  function getLinksForEntity(entityId: string): readonly Link[] {
    const rows = db
      .prepare('SELECT link_type, url, title FROM links WHERE entity_id = ?')
      .all(entityId) as readonly LinkRow[];
    return rows.map((r) => ({
      type: r.link_type as Link['type'],
      url: r.url,
      title: r.title ?? undefined,
    }));
  }

  function insertFtsEntry(
    entityId: string,
    name: string,
    description: string,
    tagsText: string,
    owner: string,
  ): void {
    db.prepare(INSERT_FTS_SQL).run({
      entity_id: entityId,
      name,
      description,
      tags_text: tagsText,
      owner,
    });
  }

  function deleteFtsByEntityId(entityId: string): void {
    db.prepare(DELETE_FTS_BY_ENTITY_SQL).run({ entity_id: entityId });
  }

  function deleteFtsByFilePath(filePath: string): void {
    db.prepare(DELETE_FTS_BY_FILE_SQL).run({ file_path: filePath });
  }

  function getEntityById(id: string): StoredEntity | undefined {
    const row = db.prepare('SELECT * FROM entities WHERE id = ?').get(id) as
      | EntityRow
      | undefined;
    if (!row) return undefined;
    const tags = getTagsForEntity(id);
    const links = getLinksForEntity(id);
    return rowToStoredEntity(row, tags, links);
  }

  function getEntitiesByFilePath(filePath: string): readonly StoredEntity[] {
    const rows = db
      .prepare('SELECT * FROM entities WHERE file_path = ?')
      .all(filePath) as readonly EntityRow[];
    return rows.map((row) => {
      const tags = getTagsForEntity(row.id);
      const links = getLinksForEntity(row.id);
      return rowToStoredEntity(row, tags, links);
    });
  }

  function insertEntity(entity: EntityInsert): string {
    const id = generateEntityId(entity.filePath, entity.name, entity.line);
    const params = {
      id,
      file_path: entity.filePath,
      name: entity.name,
      entity_type: entity.entityType,
      description: entity.description,
      raw_docstring: entity.rawDocstring ?? null,
      signature: entity.signature ?? null,
      parent: entity.parent ?? null,
      language: entity.language,
      line: entity.line,
      column_num: entity.column,
      owner: entity.owner ?? null,
      status: entity.status ?? null,
      metadata_json: JSON.stringify(entity.metadata),
      file_hash: entity.fileHash ?? null,
    };

    db.prepare(INSERT_ENTITY_SQL).run(params);

    const tagsText = entity.tags?.join(' ') ?? '';
    insertFtsEntry(
      id,
      entity.name,
      entity.description,
      tagsText,
      entity.owner ?? '',
    );

    if (entity.tags && entity.tags.length > 0) {
      insertTags(id, entity.tags);
    }
    if (entity.links && entity.links.length > 0) {
      insertLinks(id, entity.links);
    }

    return id;
  }

  function updateEntity(id: string, entity: Partial<EntityInsert>): void {
    const existing = db
      .prepare('SELECT * FROM entities WHERE id = ?')
      .get(id) as EntityRow | undefined;
    if (!existing) return;

    deleteFtsByEntityId(id);

    const params = {
      id,
      file_path: entity.filePath ?? existing.file_path,
      name: entity.name ?? existing.name,
      entity_type: entity.entityType ?? existing.entity_type,
      description: entity.description ?? existing.description,
      raw_docstring: entity.rawDocstring ?? existing.raw_docstring,
      signature: entity.signature ?? existing.signature,
      parent: entity.parent ?? existing.parent,
      language: entity.language ?? existing.language,
      line: entity.line ?? existing.line,
      column_num: entity.column ?? existing.column_num,
      owner: entity.owner ?? existing.owner,
      status: entity.status ?? existing.status,
      metadata_json: entity.metadata
        ? JSON.stringify(entity.metadata)
        : existing.metadata_json,
      file_hash: entity.fileHash ?? existing.file_hash,
    };
    db.prepare(UPDATE_ENTITY_SQL).run(params);

    const tags = entity.tags ?? getTagsForEntity(id);
    const tagsText = tags.join(' ');
    insertFtsEntry(
      id,
      params.name,
      params.description,
      tagsText,
      params.owner ?? '',
    );
  }

  function deleteEntitiesByFilePath(filePath: string): void {
    deleteFtsByFilePath(filePath);
    db.prepare('DELETE FROM entities WHERE file_path = ?').run(filePath);
  }

  function insertRelationship(
    sourceId: string,
    targetId: string,
    type: string,
  ): void {
    db.prepare(INSERT_RELATIONSHIP_SQL).run({
      source_id: sourceId,
      target_id: targetId,
      relationship_type: type,
    });
  }

  function insertTags(entityId: string, tags: readonly string[]): void {
    const stmt = db.prepare(INSERT_TAG_SQL);
    for (const tag of tags) {
      stmt.run({ entity_id: entityId, tag });
    }
  }

  function insertLinks(entityId: string, links: readonly Link[]): void {
    const stmt = db.prepare(INSERT_LINK_SQL);
    for (const link of links) {
      stmt.run({
        entity_id: entityId,
        link_type: link.type ?? null,
        url: link.url,
        title: link.title ?? null,
      });
    }
  }

  function getStats(): IndexStats {
    const totalEntities = (
      db.prepare('SELECT COUNT(*) as count FROM entities').get() as CountRow
    ).count;
    const totalRelationships = (
      db
        .prepare('SELECT COUNT(*) as count FROM relationships')
        .get() as CountRow
    ).count;
    const totalTags = (
      db.prepare('SELECT COUNT(*) as count FROM tags').get() as CountRow
    ).count;
    const totalLinks = (
      db.prepare('SELECT COUNT(*) as count FROM links').get() as CountRow
    ).count;

    const typeRows = db
      .prepare(
        'SELECT entity_type, COUNT(*) as count FROM entities GROUP BY entity_type',
      )
      .all() as readonly TypeCountRow[];
    const entitiesByType: Record<string, number> = {};
    for (const row of typeRows) {
      entitiesByType[row.entity_type] = row.count;
    }

    const langRows = db
      .prepare(
        'SELECT language, COUNT(*) as count FROM entities GROUP BY language',
      )
      .all() as readonly LangCountRow[];
    const entitiesByLanguage: Record<string, number> = {};
    for (const row of langRows) {
      entitiesByLanguage[row.language] = row.count;
    }

    return {
      totalEntities,
      totalRelationships,
      totalTags,
      totalLinks,
      entitiesByType,
      entitiesByLanguage,
    };
  }

  function getFileHash(filePath: string): string | undefined {
    const row = db
      .prepare('SELECT file_hash FROM entities WHERE file_path = ? LIMIT 1')
      .get(filePath) as { readonly file_hash: string | null } | undefined;
    return row?.file_hash ?? undefined;
  }

  return {
    db,
    initialize,
    close,
    getEntityById,
    getEntitiesByFilePath,
    insertEntity,
    updateEntity,
    deleteEntitiesByFilePath,
    insertRelationship,
    insertTags,
    insertLinks,
    getStats,
    getFileHash,
  };
}
