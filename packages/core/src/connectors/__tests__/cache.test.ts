import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCache } from '../cache.js';

describe('ConnectorCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('get / set', () => {
    it('returns undefined for missing key', () => {
      const cache = createCache({ ttlMs: 5000 });
      expect(cache.get('missing')).toBeUndefined();
    });

    it('stores and retrieves a value', () => {
      const cache = createCache<string>({ ttlMs: 5000 });
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('stores objects immutably', () => {
      const cache = createCache<{ name: string }>({ ttlMs: 5000 });
      const obj = { name: 'test' };
      cache.set('key1', obj);

      const retrieved = cache.get('key1');
      expect(retrieved).toEqual({ name: 'test' });
      expect(retrieved).toBe(obj);
    });

    it('overwrites existing values', () => {
      const cache = createCache<string>({ ttlMs: 5000 });
      cache.set('key1', 'first');
      cache.set('key1', 'second');
      expect(cache.get('key1')).toBe('second');
    });
  });

  describe('TTL expiration', () => {
    it('expires entries after TTL', () => {
      const cache = createCache<string>({ ttlMs: 1000 });
      cache.set('key1', 'value1');

      vi.advanceTimersByTime(999);
      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(1);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('does not expire entries before TTL', () => {
      const cache = createCache<string>({ ttlMs: 5000 });
      cache.set('key1', 'value1');

      vi.advanceTimersByTime(4999);
      expect(cache.get('key1')).toBe('value1');
    });
  });

  describe('has', () => {
    it('returns false for missing key', () => {
      const cache = createCache({ ttlMs: 5000 });
      expect(cache.has('missing')).toBe(false);
    });

    it('returns true for existing key', () => {
      const cache = createCache<string>({ ttlMs: 5000 });
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('returns false for expired key', () => {
      const cache = createCache<string>({ ttlMs: 1000 });
      cache.set('key1', 'value1');
      vi.advanceTimersByTime(1000);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('removes an entry', () => {
      const cache = createCache<string>({ ttlMs: 5000 });
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('returns false for non-existent key', () => {
      const cache = createCache({ ttlMs: 5000 });
      expect(cache.delete('missing')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      const cache = createCache<string>({ ttlMs: 5000 });
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.size()).toBe(0);
    });
  });

  describe('size', () => {
    it('returns 0 for empty cache', () => {
      const cache = createCache({ ttlMs: 5000 });
      expect(cache.size()).toBe(0);
    });

    it('returns correct count', () => {
      const cache = createCache<string>({ ttlMs: 5000 });
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });

    it('excludes expired entries', () => {
      const cache = createCache<string>({ ttlMs: 1000 });
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      vi.advanceTimersByTime(1000);
      expect(cache.size()).toBe(0);
    });
  });

  describe('maxEntries', () => {
    it('evicts oldest entry when maxEntries exceeded', () => {
      const cache = createCache<string>({ ttlMs: 5000, maxEntries: 2 });
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });
  });
});
