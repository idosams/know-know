/**
 * @knowgraph
 * type: module
 * description: SQLite schema definitions with FTS5 full-text search and relationship tables
 * owner: knowgraph-core
 * status: stable
 * tags: [database, schema, sqlite, fts5]
 * context:
 *   business_goal: Provide persistent storage schema for the code knowledge graph
 *   domain: indexer-engine
 */
export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    raw_docstring TEXT,
    signature TEXT,
    parent TEXT,
    language TEXT NOT NULL,
    line INTEGER NOT NULL,
    column_num INTEGER NOT NULL DEFAULT 0,
    owner TEXT,
    status TEXT,
    metadata_json TEXT NOT NULL,
    file_hash TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,
    UNIQUE(source_id, target_id, relationship_type)
  );

  CREATE TABLE IF NOT EXISTS tags (
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (entity_id, tag)
  );

  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    link_type TEXT,
    url TEXT NOT NULL,
    title TEXT
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
    entity_id UNINDEXED,
    name, description, tags_text, owner
  );

  CREATE INDEX IF NOT EXISTS idx_entities_file_path ON entities(file_path);
  CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
  CREATE INDEX IF NOT EXISTS idx_entities_owner ON entities(owner);
  CREATE INDEX IF NOT EXISTS idx_entities_status ON entities(status);
  CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
  CREATE INDEX IF NOT EXISTS idx_links_entity ON links(entity_id);
  CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_id);
  CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_id);
`;

export const INSERT_ENTITY_SQL = `
  INSERT INTO entities (
    id, file_path, name, entity_type, description, raw_docstring,
    signature, parent, language, line, column_num, owner, status,
    metadata_json, file_hash
  ) VALUES (
    @id, @file_path, @name, @entity_type, @description, @raw_docstring,
    @signature, @parent, @language, @line, @column_num, @owner, @status,
    @metadata_json, @file_hash
  )
`;

export const UPDATE_ENTITY_SQL = `
  UPDATE entities SET
    file_path = @file_path,
    name = @name,
    entity_type = @entity_type,
    description = @description,
    raw_docstring = @raw_docstring,
    signature = @signature,
    parent = @parent,
    language = @language,
    line = @line,
    column_num = @column_num,
    owner = @owner,
    status = @status,
    metadata_json = @metadata_json,
    file_hash = @file_hash,
    updated_at = datetime('now')
  WHERE id = @id
`;

export const INSERT_FTS_SQL = `
  INSERT INTO entities_fts (entity_id, name, description, tags_text, owner)
  VALUES (@entity_id, @name, @description, @tags_text, @owner)
`;

export const DELETE_FTS_BY_ENTITY_SQL = `
  DELETE FROM entities_fts WHERE entity_id = @entity_id
`;

export const DELETE_FTS_BY_FILE_SQL = `
  DELETE FROM entities_fts WHERE entity_id IN (
    SELECT id FROM entities WHERE file_path = @file_path
  )
`;

export const INSERT_RELATIONSHIP_SQL = `
  INSERT OR IGNORE INTO relationships (source_id, target_id, relationship_type)
  VALUES (@source_id, @target_id, @relationship_type)
`;

export const INSERT_TAG_SQL = `
  INSERT OR IGNORE INTO tags (entity_id, tag) VALUES (@entity_id, @tag)
`;

export const INSERT_LINK_SQL = `
  INSERT INTO links (entity_id, link_type, url, title)
  VALUES (@entity_id, @link_type, @url, @title)
`;
