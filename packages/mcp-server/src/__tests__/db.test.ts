import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, seedTestData } from './test-helper.js';
import type { TestContext } from './test-helper.js';

describe('McpDatabase', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestDatabase();
    seedTestData(ctx.rawDb);
  });

  afterEach(() => {
    ctx.db.close();
  });

  describe('search', () => {
    it('returns matching entities by FTS text query', () => {
      const results = ctx.db.search('authentication');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('AuthService');
    });

    it('returns matching entities by name via FTS', () => {
      const results = ctx.db.search('processPayment');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('payment-processor');
    });

    it('filters by entity type using LIKE fallback', () => {
      const results = ctx.db.search('', { type: 'service' });
      expect(results.length).toBe(1);
      expect(results[0].entity_type).toBe('service');
    });

    it('filters by owner using LIKE fallback', () => {
      const results = ctx.db.search('', { owner: 'payments-team' });
      expect(results.length).toBe(1);
      expect(results[0].owner).toBe('payments-team');
    });

    it('respects limit', () => {
      const results = ctx.db.search('', { limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('returns empty array for no matches', () => {
      const results = ctx.db.search('', { owner: 'nonexistent-team-xyz' });
      expect(results).toEqual([]);
    });

    it('falls back to LIKE search for empty FTS query', () => {
      const results = ctx.db.search('', { type: 'function' });
      expect(results.length).toBe(1);
      expect(results[0].entity_type).toBe('function');
    });
  });

  describe('getById', () => {
    it('returns entity by ID', () => {
      const entity = ctx.db.getById('auth-service');
      expect(entity).toBeDefined();
      expect(entity!.name).toBe('AuthService');
      expect(entity!.entity_type).toBe('service');
    });

    it('returns undefined for missing entity', () => {
      const entity = ctx.db.getById('does-not-exist');
      expect(entity).toBeUndefined();
    });
  });

  describe('getByOwner', () => {
    it('returns entities for a given owner', () => {
      const results = ctx.db.getByOwner('platform-team');
      expect(results.length).toBe(2);
      const names = results.map((r) => r.name);
      expect(names).toContain('AuthService');
      expect(names).toContain('User');
    });

    it('returns empty array for unknown owner', () => {
      const results = ctx.db.getByOwner('unknown-team');
      expect(results).toEqual([]);
    });
  });

  describe('getDependencies', () => {
    it('returns direct dependencies for an entity', () => {
      const deps = ctx.db.getDependencies('auth-service');
      expect(deps.length).toBeGreaterThan(0);
    });

    it('returns dependencies at specified depth', () => {
      const deps = ctx.db.getDependencies('payment-processor', 2);
      expect(deps.length).toBeGreaterThanOrEqual(2);
    });

    it('includes both directions of dependency', () => {
      const deps = ctx.db.getDependencies('logger-util', 1);
      expect(deps.length).toBeGreaterThanOrEqual(1);
      expect(deps.some((d) => d.source_id === 'payment-processor')).toBe(true);
    });
  });

  describe('getLinks', () => {
    it('returns links for a specific entity', () => {
      const links = ctx.db.getLinks('auth-service');
      expect(links.length).toBe(2);
      expect(links[0].type).toBe('notion');
    });

    it('returns all links when no entity specified', () => {
      const links = ctx.db.getLinks();
      expect(links.length).toBe(3);
    });

    it('returns empty array for entity with no links', () => {
      const links = ctx.db.getLinks('user-model');
      expect(links).toEqual([]);
    });
  });

  describe('getByBusinessGoal', () => {
    it('finds entities by business goal text', () => {
      const results = ctx.db.getByBusinessGoal('revenue');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.id === 'payment-processor')).toBe(true);
    });

    it('returns empty array for unmatched goal', () => {
      const results = ctx.db.getByBusinessGoal('nonexistent-goal-xyz');
      expect(results).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('returns correct total counts', () => {
      const stats = ctx.db.getStats();
      expect(stats.totalEntities).toBe(4);
      expect(stats.totalLinks).toBe(3);
      expect(stats.totalDependencies).toBe(3);
    });

    it('returns entity type breakdown', () => {
      const stats = ctx.db.getStats();
      expect(stats.entityTypes.length).toBeGreaterThan(0);
      const serviceType = stats.entityTypes.find((t) => t.type === 'service');
      expect(serviceType).toBeDefined();
      expect(serviceType!.count).toBe(1);
    });

    it('returns owners list', () => {
      const stats = ctx.db.getStats();
      expect(stats.owners).toContain('platform-team');
      expect(stats.owners).toContain('payments-team');
    });

    it('returns languages list', () => {
      const stats = ctx.db.getStats();
      expect(stats.languages).toContain('typescript');
      expect(stats.languages).toContain('python');
    });
  });

  describe('empty database', () => {
    it('handles empty database gracefully', () => {
      const emptyCtx = createTestDatabase();
      const stats = emptyCtx.db.getStats();
      expect(stats.totalEntities).toBe(0);
      expect(stats.totalLinks).toBe(0);
      expect(stats.entityTypes).toEqual([]);
      emptyCtx.db.close();
    });
  });
});
