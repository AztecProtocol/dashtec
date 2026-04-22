import { createLogger } from '@dashtec/logger';
import { Cache } from './types';
import { MemoryCache } from './memory';
import { RedisCache } from './redis';

const logger = createLogger('CacheFactory');

/**
 * Create cache instance
 * - If redisUrl is provided: Use Redis for distributed caching
 * - Otherwise: Use in-memory cache for single instance
 */
export function createCache(redisUrl?: string, keyPrefix?: string): Cache {
  if (redisUrl) {
    logger.info('Using Redis cache');
    return new RedisCache(redisUrl, keyPrefix);
  }

  logger.info('Using in-memory cache');
  return new MemoryCache();
}
