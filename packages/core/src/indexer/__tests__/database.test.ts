import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabaseManager, generateEntityId } from '../database.js';
import type { DatabaseManager } from '../database.js';
import type { EntityInsert } from '../types.js';
import type { CoreMetadata, Link } from '../../types/index.js';

function makeEntity(overrides: Partial<EntityInsert> = {}): EntityInsert {
  const metadata: CoreMetadata = {
    type: 'function',
    description: 'Authenticates a user with credentials',
    owner: 'auth-team',
    status: 'stable',
    tags: ['auth', 'security'],
    links: [
      { url: 'https://example.com/docs', type: 'github', title: 'API Docs' },
    ],
  };

  return {
    filePath: 'src/auth/login.ts',
    name: 'authenticate',
    entityType: 'function',
    description: 'Authenticates a user with credentials',
    rawDocstring:
      '/** @know { type: function, description: "Authenticates a user" } */',
    signature:
      'authenticate(username: string, password: string): Promise<User>',
    parent: 'AuthService',
    language: 'typescript',
    line: 42,
    column: 2,
    owner: 'auth-team',
    status: 'stable',
    metadata,
    tags: ['auth', 'security'],
    links: [
      { url: 'https://example.com/docs', type: 'github', title: 'API Docs' },
    ],
    fileHash: 'abc123',
    ...overrides,
  };
}

describe('generateEntityId', () => {
  it('produces deterministic SHA256 hex from filePath:name:line', () => {
    const id1 = generateEntityId('src/foo.ts', 'bar', 10);
    const id2 = generateEntityId('src/foo.ts', 'bar', 10);
    expect(id1).toBe(id2);
    expect(id1).toHaveLength(64); // SHA256 hex
  });

  it('produces different IDs for different inputs', () => {
    const id1 = generateEntityId('src/foo.ts', 'bar', 10);
    const id2 = generateEntityId('src/foo.ts', 'baz', 10);
    expect(id1).not.toBe(id2);
  });
});

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;

  beforeEach(() => {
    dbManager = createDatabaseManager();
    dbManager.initialize();
  });

  afterEach(() => {
    dbManager.close();
  });

  describe('initialize', () => {
    it('creates all required tables', () => {
      const tables = dbManager.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
        )
        .all() as readonly { name: string }[];
      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain('entities');
      expect(tableNames).toContain('relationships');
      expect(tableNames).toContain('tags');
      expect(tableNames).toContain('links');
    });

    it('creates FTS virtual table', () => {
      const tables = dbManager.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'entities_fts%'",
        )
        .all() as readonly { name: string }[];
      expect(tables.length).toBeGreaterThan(0);
    });
  });

  describe('insertEntity / getEntityById', () => {
    it('inserts and retrieves an entity with all fields', () => {
      const entity = makeEntity();
      const id = dbManager.insertEntity(entity);

      const retrieved = dbManager.getEntityById(id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.filePath).toBe('src/auth/login.ts');
      expect(retrieved!.name).toBe('authenticate');
      expect(retrieved!.entityType).toBe('function');
      expect(retrieved!.description).toBe(
        'Authenticates a user with credentials',
      );
      expect(retrieved!.rawDocstring).toContain('@know');
      expect(retrieved!.signature).toContain('authenticate');
      expect(retrieved!.parent).toBe('AuthService');
      expect(retrieved!.language).toBe('typescript');
      expect(retrieved!.line).toBe(42);
      expect(retrieved!.column).toBe(2);
      expect(retrieved!.owner).toBe('auth-team');
      expect(retrieved!.status).toBe('stable');
      expect(retrieved!.fileHash).toBe('abc123');
    });

    it('returns undefined for non-existent entity', () => {
      expect(dbManager.getEntityById('nonexistent')).toBeUndefined();
    });

    it('stores and retrieves tags', () => {
      const entity = makeEntity({ tags: ['auth', 'security', 'core'] });
      const id = dbManager.insertEntity(entity);

      const retrieved = dbManager.getEntityById(id);
      expect(retrieved!.tags).toContain('auth');
      expect(retrieved!.tags).toContain('security');
      expect(retrieved!.tags).toContain('core');
    });

    it('stores and retrieves links', () => {
      const links: readonly Link[] = [
        { url: 'https://example.com/docs', type: 'github', title: 'API Docs' },
        { url: 'https://notion.so/design', type: 'notion' },
      ];
      const entity = makeEntity({ links });
      const id = dbManager.insertEntity(entity);

      const retrieved = dbManager.getEntityById(id);
      expect(retrieved!.links).toHaveLength(2);
      expect(retrieved!.links[0].url).toBe('https://example.com/docs');
      expect(retrieved!.links[1].url).toBe('https://notion.so/design');
    });

    it('stores metadata as JSON', () => {
      const entity = makeEntity();
      const id = dbManager.insertEntity(entity);

      const retrieved = dbManager.getEntityById(id);
      expect(retrieved!.metadata.type).toBe('function');
      expect(retrieved!.metadata.description).toBe(
        'Authenticates a user with credentials',
      );
    });
  });

  describe('getEntitiesByFilePath', () => {
    it('returns all entities for a file', () => {
      dbManager.insertEntity(makeEntity({ name: 'func1', line: 1 }));
      dbManager.insertEntity(makeEntity({ name: 'func2', line: 20 }));
      dbManager.insertEntity(
        makeEntity({
          name: 'other',
          line: 1,
          filePath: 'src/other.ts',
        }),
      );

      const entities = dbManager.getEntitiesByFilePath('src/auth/login.ts');
      expect(entities).toHaveLength(2);
      expect(entities.map((e) => e.name).sort()).toEqual(['func1', 'func2']);
    });

    it('returns empty array for unknown file', () => {
      const entities = dbManager.getEntitiesByFilePath('nonexistent.ts');
      expect(entities).toEqual([]);
    });
  });

  describe('updateEntity', () => {
    it('updates specific fields', () => {
      const entity = makeEntity();
      const id = dbManager.insertEntity(entity);

      dbManager.updateEntity(id, { description: 'Updated description' });

      const retrieved = dbManager.getEntityById(id);
      expect(retrieved!.description).toBe('Updated description');
      expect(retrieved!.name).toBe('authenticate'); // unchanged
    });

    it('does nothing for non-existent entity', () => {
      // Should not throw
      dbManager.updateEntity('nonexistent', { description: 'test' });
    });
  });

  describe('deleteEntitiesByFilePath', () => {
    it('removes all entities for a file path', () => {
      dbManager.insertEntity(makeEntity({ name: 'func1', line: 1 }));
      dbManager.insertEntity(makeEntity({ name: 'func2', line: 20 }));

      dbManager.deleteEntitiesByFilePath('src/auth/login.ts');

      const entities = dbManager.getEntitiesByFilePath('src/auth/login.ts');
      expect(entities).toHaveLength(0);
    });

    it('cascades to tags and links', () => {
      const id = dbManager.insertEntity(makeEntity());
      dbManager.deleteEntitiesByFilePath('src/auth/login.ts');

      const tags = dbManager.db
        .prepare('SELECT * FROM tags WHERE entity_id = ?')
        .all(id);
      expect(tags).toHaveLength(0);

      const links = dbManager.db
        .prepare('SELECT * FROM links WHERE entity_id = ?')
        .all(id);
      expect(links).toHaveLength(0);
    });
  });

  describe('insertRelationship', () => {
    it('creates a relationship between two entities', () => {
      const id1 = dbManager.insertEntity(
        makeEntity({ name: 'caller', line: 1 }),
      );
      const id2 = dbManager.insertEntity(
        makeEntity({ name: 'callee', line: 50 }),
      );

      dbManager.insertRelationship(id1, id2, 'calls');

      const rows = dbManager.db
        .prepare('SELECT * FROM relationships WHERE source_id = ?')
        .all(id1) as readonly {
        source_id: string;
        target_id: string;
        relationship_type: string;
      }[];
      expect(rows).toHaveLength(1);
      expect(rows[0].target_id).toBe(id2);
      expect(rows[0].relationship_type).toBe('calls');
    });

    it('ignores duplicate relationships', () => {
      const id1 = dbManager.insertEntity(makeEntity({ name: 'a', line: 1 }));
      const id2 = dbManager.insertEntity(makeEntity({ name: 'b', line: 2 }));

      dbManager.insertRelationship(id1, id2, 'calls');
      dbManager.insertRelationship(id1, id2, 'calls'); // duplicate

      const rows = dbManager.db
        .prepare('SELECT * FROM relationships WHERE source_id = ?')
        .all(id1);
      expect(rows).toHaveLength(1);
    });
  });

  describe('insertTags', () => {
    it('adds tags to an entity', () => {
      const id = dbManager.insertEntity(makeEntity({ tags: [] }));
      dbManager.insertTags(id, ['new-tag', 'another-tag']);

      const retrieved = dbManager.getEntityById(id);
      expect(retrieved!.tags).toContain('new-tag');
      expect(retrieved!.tags).toContain('another-tag');
    });
  });

  describe('insertLinks', () => {
    it('adds links to an entity', () => {
      const id = dbManager.insertEntity(makeEntity({ links: [] }));
      dbManager.insertLinks(id, [
        {
          url: 'https://jira.example.com/ISSUE-1',
          type: 'jira',
          title: 'Bug ticket',
        },
      ]);

      const retrieved = dbManager.getEntityById(id);
      expect(retrieved!.links).toHaveLength(1);
      expect(retrieved!.links[0].url).toBe('https://jira.example.com/ISSUE-1');
    });
  });

  describe('FTS5 search', () => {
    it('finds entities by name via FTS', () => {
      dbManager.insertEntity(makeEntity({ name: 'authenticate', line: 1 }));
      dbManager.insertEntity(
        makeEntity({
          name: 'logout',
          line: 100,
          description: 'Logs the user out',
          metadata: { type: 'function', description: 'Logs the user out' },
        }),
      );

      const rows = dbManager.db
        .prepare(
          `SELECT e.* FROM entities e
           WHERE e.id IN (SELECT entity_id FROM entities_fts WHERE entities_fts MATCH ?)`,
        )
        .all('authenticate') as readonly { name: string }[];

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('authenticate');
    });

    it('finds entities by description via FTS', () => {
      dbManager.insertEntity(
        makeEntity({
          name: 'processPayment',
          line: 1,
          description: 'Processes a stripe payment',
          metadata: {
            type: 'function',
            description: 'Processes a stripe payment',
          },
        }),
      );

      const rows = dbManager.db
        .prepare(
          `SELECT e.* FROM entities e
           WHERE e.id IN (SELECT entity_id FROM entities_fts WHERE entities_fts MATCH ?)`,
        )
        .all('stripe') as readonly { name: string }[];

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('processPayment');
    });
  });

  describe('getStats', () => {
    it('returns accurate counts', () => {
      const id1 = dbManager.insertEntity(
        makeEntity({ name: 'func1', line: 1 }),
      );
      const id2 = dbManager.insertEntity(
        makeEntity({
          name: 'func2',
          line: 2,
          entityType: 'class',
          metadata: { type: 'class', description: 'A class' },
        }),
      );
      dbManager.insertRelationship(id1, id2, 'depends_on');

      const stats = dbManager.getStats();
      expect(stats.totalEntities).toBe(2);
      expect(stats.totalRelationships).toBe(1);
      expect(stats.totalTags).toBe(4); // 2 tags per entity
      expect(stats.entitiesByType['function']).toBe(1);
      expect(stats.entitiesByType['class']).toBe(1);
      expect(stats.entitiesByLanguage['typescript']).toBe(2);
    });

    it('returns zeros for empty database', () => {
      const stats = dbManager.getStats();
      expect(stats.totalEntities).toBe(0);
      expect(stats.totalRelationships).toBe(0);
      expect(stats.totalTags).toBe(0);
      expect(stats.totalLinks).toBe(0);
    });
  });

  describe('getFileHash', () => {
    it('returns the file hash for an existing file', () => {
      dbManager.insertEntity(makeEntity({ fileHash: 'hash123' }));
      expect(dbManager.getFileHash('src/auth/login.ts')).toBe('hash123');
    });

    it('returns undefined for unknown file', () => {
      expect(dbManager.getFileHash('nonexistent.ts')).toBeUndefined();
    });
  });
});
