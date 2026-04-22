import { createRpcClient, type CachedPublicClient } from '@dashtec/shared-utils';
import { getEnv } from '@/config';

const env = getEnv();

// Singleton pattern for Next.js hot reloading
const globalForViem = globalThis as unknown as {
  viemClient: CachedPublicClient | undefined;
};

function getViemClient(): CachedPublicClient | null {
  if (env.NODE_ENV === 'test') {
    return null;
  }

  if (globalForViem.viemClient) {
    return globalForViem.viemClient;
  }

  const urls = env.ETHEREUM_RPC_URL.split(',').map((url: string) => url.trim());

  const client = createRpcClient({
    urls,
    timeout: 10000,
    retryCount: 3,
    redisUrl: env.REDIS_URL,
  });

  if (env.NODE_ENV !== 'production') {
    globalForViem.viemClient = client;
  }

  return client;
}

export async function getPublicClient(): Promise<CachedPublicClient | null> {
  return getViemClient();
}

export const viemPublicClient = getViemClient(); 
