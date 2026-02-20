/**
 * @knowgraph
 * type: module
 * description: In-memory TTL cache for connector API responses to reduce external calls
 * owner: knowgraph-core
 * status: experimental
 * tags: [connector, cache, ttl, performance]
 * context:
 *   business_goal: Reduce API calls to external services by caching responses
 *   domain: connectors
 */

interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
}

export interface ConnectorCache<T = unknown> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
}

export interface CacheOptions {
  readonly ttlMs: number;
  readonly maxEntries?: number;
}

export function createCache<T = unknown>(options: CacheOptions): ConnectorCache<T> {
  const { ttlMs, maxEntries = 1000 } = options;
  const entries = new Map<string, CacheEntry<T>>();

  function isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() >= entry.expiresAt;
  }

  function evictExpired(): void {
    for (const [key, entry] of entries) {
      if (isExpired(entry)) {
        entries.delete(key);
      }
    }
  }

  function evictOldest(): void {
    if (entries.size <= maxEntries) return;
    const firstKey = entries.keys().next().value;
    if (firstKey !== undefined) {
      entries.delete(firstKey);
    }
  }

  return {
    get(key: string): T | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (isExpired(entry)) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },

    set(key: string, value: T): void {
      entries.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      evictOldest();
    },

    has(key: string): boolean {
      const entry = entries.get(key);
      if (!entry) return false;
      if (isExpired(entry)) {
        entries.delete(key);
        return false;
      }
      return true;
    },

    delete(key: string): boolean {
      return entries.delete(key);
    },

    clear(): void {
      entries.clear();
    },

    size(): number {
      evictExpired();
      return entries.size;
    },
  };
}
