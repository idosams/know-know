/**
 * @knowgraph
 * type: module
 * description: Read-only SQLite database layer for MCP server queries
 * owner: knowgraph-mcp
 * status: stable
 * tags: [mcp, database, sqlite, readonly]
 * context:
 *   business_goal: Provide efficient read-only access to the code knowledge graph
 *   domain: mcp-server
 */
import Database from 'better-sqlite3';

export interface EntityRow {
  readonly id: string;
  readonly name: string;
  readonly file_path: string;
  readonly line: number;
  readonly column: number;
  readonly language: string;
  readonly entity_type: string;
  readonly description: string;
  readonly owner: string | null;
  readonly status: string | null;
  readonly tags: string | null;
  readonly links: string | null;
  readonly signature: string | null;
  readonly parent: string | null;
  readonly raw_docstring: string | null;
  readonly business_goal: string | null;
  readonly funnel_stage: string | null;
  readonly revenue_impact: string | null;
  readonly dependencies: string | null;
  readonly compliance: string | null;
  readonly operational: string | null;
}

export interface LinkRow {
  readonly entity_id: string;
  readonly type: string | null;
  readonly url: string;
  readonly title: string | null;
}

export interface DependencyRow {
  readonly source_id: string;
  readonly target_id: string;
  readonly dependency_type: string;
}

export interface GraphStats {
  readonly totalEntities: number;
  readonly entityTypes: ReadonlyArray<{
    readonly type: string;
    readonly count: number;
  }>;
  readonly totalLinks: number;
  readonly totalDependencies: number;
  readonly owners: ReadonlyArray<string>;
  readonly languages: ReadonlyArray<string>;
}

export interface SearchFilters {
  readonly type?: string;
  readonly owner?: string;
  readonly tags?: readonly string[];
  readonly limit?: number;
}

export interface McpDatabase {
  search(query: string, filters?: SearchFilters): readonly EntityRow[];
  getById(id: string): EntityRow | undefined;
  getByOwner(owner: string): readonly EntityRow[];
  getDependencies(entityId: string, depth?: number): readonly DependencyRow[];
  getLinks(entityId?: string): readonly LinkRow[];
  getByBusinessGoal(goal: string): readonly EntityRow[];
  getStats(): GraphStats;
  close(): void;
}

function buildFilterClause(filters?: SearchFilters): {
  readonly where: string;
  readonly params: readonly unknown[];
} {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.type) {
    conditions.push('e.entity_type = ?');
    params.push(filters.type);
  }

  if (filters?.owner) {
    conditions.push('e.owner = ?');
    params.push(filters.owner);
  }

  if (filters?.tags && filters.tags.length > 0) {
    const tagConditions = filters.tags.map(() => 'e.tags LIKE ?');
    conditions.push(`(${tagConditions.join(' AND ')})`);
    for (const tag of filters.tags) {
      params.push(`%${tag}%`);
    }
  }

  const where = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
  return { where, params };
}

function hasFtsTable(db: Database.Database): boolean {
  try {
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='entities_fts'",
      )
      .get() as { name: string } | undefined;
    return row !== undefined;
  } catch {
    return false;
  }
}

function createDatabaseApi(
  db: Database.Database,
  ftsEnabled: boolean,
): McpDatabase {
  const search = (
    query: string,
    filters?: SearchFilters,
  ): readonly EntityRow[] => {
    const limit = filters?.limit ?? 20;
    const { where: filterWhere, params: filterParams } =
      buildFilterClause(filters);

    if (ftsEnabled && query.trim().length > 0) {
      try {
        const stmt = db.prepare(`
          SELECT e.* FROM entities e
          WHERE e.rowid IN (SELECT rowid FROM entities_fts WHERE entities_fts MATCH ?)${filterWhere}
          LIMIT ?
        `);
        return stmt.all(query, ...filterParams, limit) as EntityRow[];
      } catch {
        // Fall through to LIKE search if FTS query syntax is invalid
      }
    }

    const stmt = db.prepare(`
      SELECT * FROM entities e
      WHERE (e.name LIKE ? OR e.description LIKE ?)${filterWhere}
      LIMIT ?
    `);
    const pattern = `%${query}%`;
    return stmt.all(pattern, pattern, ...filterParams, limit) as EntityRow[];
  };

  const getById = (id: string): EntityRow | undefined => {
    return db.prepare('SELECT * FROM entities WHERE id = ?').get(id) as
      | EntityRow
      | undefined;
  };

  const getByOwner = (owner: string): readonly EntityRow[] => {
    return db
      .prepare('SELECT * FROM entities WHERE owner = ?')
      .all(owner) as EntityRow[];
  };

  const getDependencies = (
    entityId: string,
    depth: number = 1,
  ): readonly DependencyRow[] => {
    if (depth <= 1) {
      return db
        .prepare(
          'SELECT * FROM dependencies WHERE source_id = ? OR target_id = ?',
        )
        .all(entityId, entityId) as DependencyRow[];
    }

    const visited = new Set<string>();
    const result: DependencyRow[] = [];
    const queue: Array<{ readonly id: string; readonly currentDepth: number }> =
      [{ id: entityId, currentDepth: 0 }];

    const stmt = db.prepare(
      'SELECT * FROM dependencies WHERE source_id = ? OR target_id = ?',
    );

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id) || current.currentDepth >= depth) {
        continue;
      }
      visited.add(current.id);

      const deps = stmt.all(current.id, current.id) as DependencyRow[];
      for (const dep of deps) {
        result.push(dep);
        const nextId =
          dep.source_id === current.id ? dep.target_id : dep.source_id;
        if (!visited.has(nextId)) {
          queue.push({ id: nextId, currentDepth: current.currentDepth + 1 });
        }
      }
    }

    return result;
  };

  const getLinks = (entityId?: string): readonly LinkRow[] => {
    if (entityId) {
      return db
        .prepare('SELECT * FROM links WHERE entity_id = ?')
        .all(entityId) as LinkRow[];
    }
    return db.prepare('SELECT * FROM links').all() as LinkRow[];
  };

  const getByBusinessGoal = (goal: string): readonly EntityRow[] => {
    const pattern = `%${goal}%`;
    return db
      .prepare(
        'SELECT * FROM entities WHERE business_goal LIKE ? OR description LIKE ?',
      )
      .all(pattern, pattern) as EntityRow[];
  };

  const getStats = (): GraphStats => {
    const totalEntities = (
      db.prepare('SELECT COUNT(*) as count FROM entities').get() as {
        count: number;
      }
    ).count;

    const entityTypes = db
      .prepare(
        'SELECT entity_type as type, COUNT(*) as count FROM entities GROUP BY entity_type',
      )
      .all() as Array<{ type: string; count: number }>;

    const totalLinks = (
      db.prepare('SELECT COUNT(*) as count FROM links').get() as {
        count: number;
      }
    ).count;

    const totalDependencies = (
      db.prepare('SELECT COUNT(*) as count FROM dependencies').get() as {
        count: number;
      }
    ).count;

    const ownerRows = db
      .prepare('SELECT DISTINCT owner FROM entities WHERE owner IS NOT NULL')
      .all() as Array<{ owner: string }>;

    const languageRows = db
      .prepare('SELECT DISTINCT language FROM entities')
      .all() as Array<{ language: string }>;

    return {
      totalEntities,
      entityTypes,
      totalLinks,
      totalDependencies,
      owners: ownerRows.map((r) => r.owner),
      languages: languageRows.map((r) => r.language),
    };
  };

  const close = (): void => {
    db.close();
  };

  return {
    search,
    getById,
    getByOwner,
    getDependencies,
    getLinks,
    getByBusinessGoal,
    getStats,
    close,
  };
}

export function openDatabase(dbPath: string): McpDatabase {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  db.pragma('journal_mode = WAL');
  return createDatabaseApi(db, hasFtsTable(db));
}

export function createInMemoryDatabase(): {
  readonly db: McpDatabase;
  readonly rawDb: Database.Database;
} {
  const rawDb = new Database(':memory:');

  rawDb.exec(`
    CREATE TABLE entities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      line INTEGER NOT NULL,
      column INTEGER NOT NULL,
      language TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      description TEXT NOT NULL,
      owner TEXT,
      status TEXT,
      tags TEXT,
      links TEXT,
      signature TEXT,
      parent TEXT,
      raw_docstring TEXT,
      business_goal TEXT,
      funnel_stage TEXT,
      revenue_impact TEXT,
      dependencies TEXT,
      compliance TEXT,
      operational TEXT
    );

    CREATE TABLE links (
      entity_id TEXT NOT NULL,
      type TEXT,
      url TEXT NOT NULL,
      title TEXT,
      FOREIGN KEY (entity_id) REFERENCES entities(id)
    );

    CREATE TABLE dependencies (
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      dependency_type TEXT NOT NULL,
      FOREIGN KEY (source_id) REFERENCES entities(id),
      FOREIGN KEY (target_id) REFERENCES entities(id)
    );

    CREATE VIRTUAL TABLE entities_fts USING fts5(
      name, description, tags, business_goal,
      content='entities',
      content_rowid='rowid'
    );
  `);

  return { db: createDatabaseApi(rawDb, true), rawDb };
}
