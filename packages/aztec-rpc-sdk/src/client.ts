/**
 * Aztec RPC Client
 *
 * HTTP client for Aztec Node JSON-RPC API
 */
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  AztecRpcClientOptions,
} from './types';

/**
 * Create an Aztec RPC client
 */
export function createAztecRpcClient(options: AztecRpcClientOptions) {
  const {
    url,
    timeout = 30000,
    retries = 3,
    retryDelay = 1000,
  } = options;

  /**
   * Make a JSON-RPC request
   */
  async function request<T>(method: string, params: unknown[] = []): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await makeRequest<T>(method, params);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries) {
          await sleep(retryDelay * (attempt + 1));
        }
      }
    }

    throw lastError ?? new Error('Request failed');
  }

  /**
   * Make a single request (no retry)
   */
  async function makeRequest<T>(method: string, params: unknown[] = []): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const body: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as JsonRpcResponse<T>;

      if (data.error) {
        throw new Error(`RPC Error [${data.error.code}]: ${data.error.message}`);
      }

      if (data.result === undefined) {
        throw new Error('No result in response');
      }

      return data.result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      // Unwrap undici's opaque "fetch failed" to surface the real cause
      if (error instanceof TypeError && error.message === 'fetch failed') {
        const cause = (error as Error & { cause?: Error }).cause;
        const detail = cause?.message ?? 'unknown network error';
        throw new Error(`Fetch failed (${url}): ${detail}`);
      }

      throw error;
    }
  }

  return {
    request,
    url,
  };
}

export type AztecRpcClient = ReturnType<typeof createAztecRpcClient>;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
