import { createPublicClient, http, fallback } from 'viem';
import { createLogger } from '@dashtec/logger';
import { RpcClientOptions, CachedPublicClient, ContractReadParams, CachedReadContractOptions } from './types';
import { initializeRpcCache, readContractWithCache } from './cache';

const logger = createLogger('RpcClient');

/**
 * Create viem public client with fallback support and caching
 */
export function createRpcClient(options: RpcClientOptions): CachedPublicClient {
  const { urls, timeout = 30000, retryCount = 3, redisUrl } = options;

  if (!urls.length) {
    throw new Error('At least one RPC URL is required');
  }

  initializeRpcCache(redisUrl);

  const transports = urls.map((url, index) =>
    http(url, {
      timeout,
      retryCount,
      onFetchRequest: (request) => {
        if (index === 0) {
          logger.debug(`RPC request to ${url}`, { url: request.url });
        } else {
          logger.warn(`Fallback RPC request to ${url}`, { url: request.url });
        }
      },
      onFetchResponse: (response) => {
        if (index === 0) {
          logger.debug(`RPC response from ${url}`, { status: response.status });
        } else {
          logger.info(`Fallback RPC response from ${url}`, { status: response.status });
        }
      },
    })
  );

  const transport = transports.length > 1 ? fallback(transports) : transports[0];

  const client = createPublicClient({
    transport,
  }) as CachedPublicClient;

  client.readContractWithCache = async function <T>(params: ContractReadParams, cacheOptions?: CachedReadContractOptions) {
    return readContractWithCache<T>(this, params, cacheOptions);
  };

  return client;
}
