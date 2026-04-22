import { Cache, CacheEntry } from './types';

/**
 * In-memory cache implementation
 * Simple Map-based cache for single-instance deployments
 */
export class MemoryCache implements Cache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  async get<T>(key: string, maxAge?: number): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (maxAge) {
      const age = Date.now() - entry.timestamp;
      if (age > maxAge) {
        this.cache.delete(key);
        return null;
      }
    }

    return entry.value;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  async clear(key?: string): Promise<void> {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}
