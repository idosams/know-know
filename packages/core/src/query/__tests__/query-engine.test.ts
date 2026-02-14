import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabaseManager } from '../../indexer/database.js';
import type { DatabaseManager } from '../../indexer/database.js';
import type { EntityInsert } from '../../indexer/types.js';
import type { CoreMetadata } from '../../types/index.js';
import { createQueryEngine } from '../query-engine.js';
import type { QueryEngine } from '../query-engine.js';

function makeEntity(overrides: Partial<EntityInsert> = {}): EntityInsert {
  const metadata: CoreMetadata = {
    type: overrides.entityType ?? 'function',
    description: overrides.description ?? 'A test function',
    owner: overrides.owner,
    status: overrides.status,
    tags: overrides.tags ? [...overrides.tags] : undefined,
  };

  return {
    filePath: 'src/test.ts',
    name: 'testFunc',
    entityType: 'function',
    description: 'A test function',
    language: 'typescript',
    line: 1,
    column: 0,
    metadata,
    ...overrides,
    // Ensure metadata reflects overrides
    ...(overrides.metadata ? {} : { metadata }),
  };
}

describe('QueryEngine', () => {
  let dbManager: DatabaseManager;
  let queryEngine: QueryEngine;

  beforeEach(() => {
    dbManager = createDatabaseManager();
    dbManager.initialize();
    queryEngine = createQueryEngine(dbManager);
  });

  afterEach(() => {
    dbManager.close();
  });

  describe('search', () => {
    it('returns all entities with no filters', () => {
      dbManager.insertEntity(makeEntity({ name: 'func1', line: 1 }));
      dbManager.insertEntity(makeEntity({ name: 'func2', line: 2 }));

      const result = queryEngine.search({});
      expect(result.entities).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('searches by text query using FTS', () => {
      dbManager.insertEntity(makeEntity({
        name: 'authenticate',
        line: 1,
        description: 'Authenticates user credentials',
        metadata: { type: 'function', description: 'Authenticates user credentials' },
      }));
      dbManager.insertEntity(makeEntity({
        name: 'processPayment',
        line: 2,
        description: 'Processes a stripe payment',
        metadata: { type: 'function', description: 'Processes a stripe payment' },
      }));

      const result = queryEngine.search({ query: 'authenticate' });
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('authenticate');
    });

    it('filters by entity type', () => {
      dbManager.insertEntity(makeEntity({
        name: 'MyClass',
        line: 1,
        entityType: 'class',
        metadata: { type: 'class', description: 'A class' },
      }));
      dbManager.insertEntity(makeEntity({ name: 'myFunc', line: 2 }));

      const result = queryEngine.search({ type: 'class' });
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('MyClass');
    });

    it('filters by owner', () => {
      dbManager.insertEntity(makeEntity({ name: 'func1', line: 1, owner: 'team-a' }));
      dbManager.insertEntity(makeEntity({ name: 'func2', line: 2, owner: 'team-b' }));

      const result = queryEngine.search({ owner: 'team-a' });
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('func1');
    });

    it('filters by status', () => {
      dbManager.insertEntity(makeEntity({ name: 'old', line: 1, status: 'deprecated' }));
      dbManager.insertEntity(makeEntity({ name: 'current', line: 2, status: 'stable' }));

      const result = queryEngine.search({ status: 'deprecated' });
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('old');
    });

    it('filters by tags', () => {
      dbManager.insertEntity(makeEntity({ name: 'authFunc', line: 1, tags: ['auth', 'security'] }));
      dbManager.insertEntity(makeEntity({ name: 'payFunc', line: 2, tags: ['payments'] }));

      const result = queryEngine.search({ tags: ['auth'] });
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('authFunc');
    });

    it('filters by file path', () => {
      dbManager.insertEntity(makeEntity({ name: 'func1', line: 1, filePath: 'src/auth.ts' }));
      dbManager.insertEntity(makeEntity({ name: 'func2', line: 1, filePath: 'src/pay.ts' }));

      const result = queryEngine.search({ filePath: 'src/auth.ts' });
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('func1');
    });

    it('combines multiple filters', () => {
      dbManager.insertEntity(makeEntity({
        name: 'authLogin',
        line: 1,
        entityType: 'function',
        owner: 'auth-team',
        tags: ['auth'],
      }));
      dbManager.insertEntity(makeEntity({
        name: 'AuthService',
        line: 10,
        entityType: 'class',
        owner: 'auth-team',
        tags: ['auth'],
        metadata: { type: 'class', description: 'A class' },
      }));
      dbManager.insertEntity(makeEntity({
        name: 'payProcess',
        line: 20,
        entityType: 'function',
        owner: 'pay-team',
        tags: ['payments'],
      }));

      const result = queryEngine.search({
        type: 'function',
        owner: 'auth-team',
      });
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('authLogin');
    });

    it('supports pagination with limit and offset', () => {
      for (let i = 0; i < 10; i++) {
        dbManager.insertEntity(makeEntity({ name: `func${i}`, line: i + 1 }));
      }

      const page1 = queryEngine.search({ limit: 3, offset: 0 });
      expect(page1.entities).toHaveLength(3);
      expect(page1.total).toBe(10);

      const page2 = queryEngine.search({ limit: 3, offset: 3 });
      expect(page2.entities).toHaveLength(3);

      // Ensure no overlap
      const page1Names = page1.entities.map((e) => e.name);
      const page2Names = page2.entities.map((e) => e.name);
      for (const name of page1Names) {
        expect(page2Names).not.toContain(name);
      }
    });

    it('returns query options in result', () => {
      const options = { type: 'function' as const, limit: 10 };
      const result = queryEngine.search(options);
      expect(result.query).toEqual(options);
    });
  });

  describe('getEntity', () => {
    it('returns entity by id', () => {
      const id = dbManager.insertEntity(makeEntity());
      const entity = queryEngine.getEntity(id);
      expect(entity).toBeDefined();
      expect(entity!.name).toBe('testFunc');
    });

    it('returns undefined for unknown id', () => {
      expect(queryEngine.getEntity('unknown')).toBeUndefined();
    });
  });

  describe('getDependencies', () => {
    it('returns entities that the given entity depends on', () => {
      const id1 = dbManager.insertEntity(makeEntity({ name: 'caller', line: 1 }));
      const id2 = dbManager.insertEntity(makeEntity({ name: 'callee', line: 2 }));
      dbManager.insertRelationship(id1, id2, 'depends_on');

      const deps = queryEngine.getDependencies(id1);
      expect(deps).toHaveLength(1);
      expect(deps[0].name).toBe('callee');
    });

    it('returns empty array when no dependencies', () => {
      const id = dbManager.insertEntity(makeEntity());
      expect(queryEngine.getDependencies(id)).toHaveLength(0);
    });
  });

  describe('getDependents', () => {
    it('returns entities that depend on the given entity', () => {
      const id1 = dbManager.insertEntity(makeEntity({ name: 'caller', line: 1 }));
      const id2 = dbManager.insertEntity(makeEntity({ name: 'callee', line: 2 }));
      dbManager.insertRelationship(id1, id2, 'depends_on');

      const dependents = queryEngine.getDependents(id2);
      expect(dependents).toHaveLength(1);
      expect(dependents[0].name).toBe('caller');
    });
  });

  describe('getByOwner', () => {
    it('returns all entities for a given owner', () => {
      dbManager.insertEntity(makeEntity({ name: 'f1', line: 1, owner: 'team-x' }));
      dbManager.insertEntity(makeEntity({ name: 'f2', line: 2, owner: 'team-x' }));
      dbManager.insertEntity(makeEntity({ name: 'f3', line: 3, owner: 'team-y' }));

      const entities = queryEngine.getByOwner('team-x');
      expect(entities).toHaveLength(2);
    });
  });

  describe('getByTag', () => {
    it('returns all entities with a given tag', () => {
      dbManager.insertEntity(makeEntity({ name: 'f1', line: 1, tags: ['auth', 'core'] }));
      dbManager.insertEntity(makeEntity({ name: 'f2', line: 2, tags: ['auth'] }));
      dbManager.insertEntity(makeEntity({ name: 'f3', line: 3, tags: ['payments'] }));

      const entities = queryEngine.getByTag('auth');
      expect(entities).toHaveLength(2);
    });

    it('returns empty array for unknown tag', () => {
      expect(queryEngine.getByTag('nonexistent')).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('returns accurate statistics', () => {
      const id1 = dbManager.insertEntity(makeEntity({ name: 'f1', line: 1, tags: ['a'] }));
      const id2 = dbManager.insertEntity(makeEntity({
        name: 'c1',
        line: 2,
        entityType: 'class',
        language: 'python',
        metadata: { type: 'class', description: 'A class' },
      }));
      dbManager.insertRelationship(id1, id2, 'uses');

      const stats = queryEngine.getStats();
      expect(stats.totalEntities).toBe(2);
      expect(stats.totalRelationships).toBe(1);
      expect(stats.entitiesByType['function']).toBe(1);
      expect(stats.entitiesByType['class']).toBe(1);
      expect(stats.entitiesByLanguage['typescript']).toBe(1);
      expect(stats.entitiesByLanguage['python']).toBe(1);
    });
  });
});
