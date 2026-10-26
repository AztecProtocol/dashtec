import { getEnv } from '@/config';
import { getActiveRollupAddress } from '@/services/rollupRegistry';

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

/** No node we run follows this rollup, so it has no live validator stats. */
export class SentinelUnavailableError extends Error {
  constructor(public readonly rollupAddress: string) {
    super(`No Aztec node is configured for rollup ${rollupAddress}`);
    this.name = 'SentinelUnavailableError';
  }
}

const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * The node to ask about a rollup. A node only reports on the rollup its software
 * runs: NEXT_SENTINEL_URL is the one following the active rollup, and a previous
 * rollup that is still producing blocks may have its own (previousRollupNode).
 */
async function sentinelUrlFor(rollupAddress?: string): Promise<string> {
  const { NEXT_SENTINEL_URL, PREVIOUS_SENTINEL_URLS } = getEnv();
  if (!rollupAddress) return NEXT_SENTINEL_URL;

  const address = rollupAddress.toLowerCase();
  if (address === await getActiveRollupAddress()) return NEXT_SENTINEL_URL;

  for (const entry of (PREVIOUS_SENTINEL_URLS ?? '').split(',')) {
    const separator = entry.indexOf('=');
    if (separator === -1) continue;
    if (entry.slice(0, separator).trim().toLowerCase() === address) return entry.slice(separator + 1).trim();
  }
  throw new SentinelUnavailableError(address);
}

/**
 * Fetch validator stats from the Sentinel JSON-RPC endpoint of the node that
 * follows `rollupAddress` (the active rollup when omitted).
 * Throws {@link SentinelApiError} on transport failure, non-2xx, or RPC error,
 * and {@link SentinelUnavailableError} when no node follows that rollup.
 */
export async function fetchValidatorStats(
  options: { timeoutMs?: number; rollupAddress?: string } = {},
): Promise<SentinelStatsResult> {
  const url = await sentinelUrlFor(options.rollupAddress);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const response = await fetch(url, {
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
