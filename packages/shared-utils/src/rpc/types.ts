import { PublicClient } from 'viem';

/**
 * Options for creating RPC client
 */
export interface RpcClientOptions {
  /** Array of RPC URLs (first is primary, rest are fallbacks) */
  urls: string[];
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retries per transport (default: 3) */
  retryCount?: number;
  /** Redis URL for caching (optional) */
  redisUrl?: string;
}

/**
 * Options for cached contract reads
 */
export interface CachedReadContractOptions {
  /** Cache key for this read */
  cacheKey: string;
  /** Cache duration in milliseconds */
  cacheDuration?: number;
  /** TTL for Redis cache in milliseconds */
  ttl?: number;
}

/**
 * Parameters for contract read
 */
export interface ContractReadParams {
  address: `0x${string}`;
  abi: any;
  functionName: string;
  args?: any[];
}

/**
 * Extended PublicClient with caching support
 */
export interface CachedPublicClient extends PublicClient {
  readContractWithCache: <T>(
    params: ContractReadParams,
    cacheOptions?: CachedReadContractOptions
  ) => Promise<T>;
}
