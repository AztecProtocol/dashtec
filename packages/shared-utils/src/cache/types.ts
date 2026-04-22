/**
 * Generic cache entry
 */
export type CacheEntry<T> = {
  value: T;
  timestamp: number;
};

/**
 * Cache interface for type safety
 */
export interface Cache {
  get<T>(key: string, maxAge?: number): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  clear(key?: string): Promise<void>;
}
