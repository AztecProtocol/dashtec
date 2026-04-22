import Redis from 'ioredis';
import { createLogger } from '@dashtec/logger';
import { Cache, CacheEntry } from './types';

const logger = createLogger('RedisCache');

/**
 * Redis-based cache implementation
 * Provides distributed caching across multiple server instances
 */
export class RedisCache implements Cache {
  private redis: Redis;
  private keyPrefix: string;

  constructor(redisUrl: string, keyPrefix: string = 'cache:') {
    this.keyPrefix = keyPrefix;
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    this.redis.on('error', (error) => {
      logger.error('Redis cache error', { error: error.message });
    });

    this.redis.on('connect', () => {
      logger.info('Redis cache connected');
    });
  }

  /**
   * Get cached value if exists and not expired
   */
  async get<T>(key: string, maxAge?: number): Promise<T | null> {
    try {
      const data = await this.redis.get(this.keyPrefix + key);
      if (!data) return null;

      const entry: CacheEntry<T> = JSON.parse(data, (_, v) => {
        if (typeof v === 'object' && v !== null && v.__type === 'bigint') {
          return BigInt(v.value);
        }
        return v;
      });

      if (maxAge) {
        const age = Date.now() - entry.timestamp;
        if (age > maxAge) {
          await this.redis.del(this.keyPrefix + key);
          return null;
        }
      }

      return entry.value;
    } catch (error) {
      logger.error(`Redis get error for key ${key}`, {
        error: error instanceof Error ? error.message : error,
      });
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
      };

      const serialized = JSON.stringify(entry, (_, v) =>
        typeof v === 'bigint' ? { __type: 'bigint', value: v.toString() } : v
      );

      if (ttl) {
        await this.redis.set(this.keyPrefix + key, serialized, 'EX', Math.floor(ttl / 1000));
      } else {
        await this.redis.set(
          this.keyPrefix + key,
          serialized,
          'EX',
          60 * 60 * 24 // 24 hours default TTL
        );
      }
    } catch (error) {
      logger.error(`Redis set error for key ${key}`, {
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Clear cache entry or all entries
   */
  async clear(key?: string): Promise<void> {
    try {
      if (key) {
        await this.redis.del(this.keyPrefix + key);
      } else {
        const keys = await this.redis.keys(this.keyPrefix + '*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      logger.error('Redis clear error', {
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
