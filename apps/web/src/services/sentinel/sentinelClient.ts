import { getEnv } from '@/config';

export interface SentinelHistoryEvent {
  slot: string | number;
  status: string;
}

export interface SentinelValidatorStats {
  history?: SentinelHistoryEvent[];
  [key: string]: unknown;
}

export interface SentinelStatsResult {
  stats: Record<string, SentinelValidatorStats>;
}

interface SentinelJsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: SentinelStatsResult;
  error?: { code: number; message: string; data?: unknown };
}

export class SentinelApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly body?: unknown) {
    super(message);
    this.name = 'SentinelApiError';
  }
}

const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * Fetch validator stats from the Sentinel JSON-RPC endpoint.
 * Throws {@link SentinelApiError} on transport failure, non-2xx, or RPC error.
 */
export async function fetchValidatorStats(
  options: { timeoutMs?: number } = {},
): Promise<SentinelStatsResult> {
  const { NEXT_SENTINEL_URL } = getEnv();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const response = await fetch(NEXT_SENTINEL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'node_getValidatorsStats',
      params: [],
      id: 1,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new SentinelApiError(
      `Sentinel API request failed: HTTP ${response.status}`,
      response.status,
      body,
    );
  }

  const payload = (await response.json()) as SentinelJsonRpcResponse;
  if (payload.error) {
    throw new SentinelApiError('Sentinel API returned RPC error', undefined, payload.error);
  }
  if (!payload.result || !payload.result.stats) {
    throw new SentinelApiError('Sentinel API response missing result.stats', undefined, payload);
  }
  return payload.result;
}

/** Restrict the stats map to only the validators in the given (lowercased) set. */
export function filterStatsToCommittee(
  stats: Record<string, SentinelValidatorStats>,
  committeeLower: Set<string>,
): Record<string, SentinelValidatorStats> {
  const out: Record<string, SentinelValidatorStats> = {};
  for (const [address, vData] of Object.entries(stats)) {
    if (committeeLower.has(address.toLowerCase())) {
      out[address] = vData;
    }
  }
  return out;
}
