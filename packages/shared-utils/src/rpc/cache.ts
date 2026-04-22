import { PublicClient } from 'viem';
import { createLogger } from '@dashtec/logger';
import { createCache, Cache } from '../cache';
import { CachedReadContractOptions, ContractReadParams } from './types';

const logger = createLogger('RpcCache');

/**
 * Singleton cache instance for RPC results
 */
let rpcCache: Cache | null = null;

/**
 * Initialize RPC cache
 */
export function initializeRpcCache(redisUrl?: string): void {
  if (!rpcCache) {
    rpcCache = createCache(redisUrl, 'rpc:');
  }
}

/**
 * Get RPC cache instance (lazy initialization)
 */
function getRpcCache(): Cache {
  if (!rpcCache) {
    rpcCache = createCache(undefined, 'rpc:');
  }
  return rpcCache;
}

export async function readContractWithCache<T>(
  client: PublicClient,
  params: ContractReadParams,
  cacheOptions?: CachedReadContractOptions
): Promise<T> {
  const cache = getRpcCache();

  const cacheKey = cacheOptions?.cacheKey
    ? `${params.address}:${params.functionName}:${cacheOptions.cacheKey}`
    : `${params.address}:${params.functionName}`;

  const cached = await cache.get<T>(cacheKey, cacheOptions?.cacheDuration);
  if (cached !== null) {
    logger.debug(`Cache hit for ${cacheKey}`);
    return cached;
  }

  const result = await client.readContract({
    address: params.address,
    abi: params.abi,
    functionName: params.functionName,
    args: params.args || [],
  }) as T;

  await cache.set(cacheKey, result, cacheOptions?.ttl);
  logger.debug(`Cached result for ${cacheKey}`);

  return result;
}
