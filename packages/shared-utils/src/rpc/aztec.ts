/**
 * Aztec Node RPC utilities
 *
 * Functions for interacting with Aztec Node JSON-RPC API
 * @see https://docs.aztec.network/the_aztec_network/reference/node_api_reference
 */

/**
 * L1 Contract Addresses returned by node_getNodeInfo
 */
export interface L1ContractAddresses {
  registryAddress: string;
  rollupAddress: string;
  inboxAddress: string;
  outboxAddress: string;
  feeJuiceAddress: string;
  stakingAssetAddress: string;
  feeJuicePortalAddress: string;
  coinIssuerAddress: string;
  rewardDistributorAddress: string;
  governanceProposerAddress: string;
  governanceAddress: string;
  gseAddress: string;
}

/**
 * Protocol Contract Addresses returned by node_getNodeInfo
 */
export interface ProtocolContractAddresses {
  classRegistry: string;
  feeJuice: string;
  instanceRegistry: string;
  multiCallEntrypoint: string;
}

/**
 * Response from node_getNodeInfo
 */
export interface AztecNodeInfo {
  nodeVersion: string;
  l1ChainId: number;
  rollupVersion: number;
  enr: string;
  l1ContractAddresses: L1ContractAddresses;
  protocolContractAddresses: ProtocolContractAddresses;
}

/**
 * JSON-RPC request/response types
 */
export interface JsonRpcRequest {
  jsonrpc: string;
  id: number | string;
  method: string;
  params?: unknown[];
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: string;
  id: number | string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Fetch node info from an Aztec RPC endpoint
 * @param url - The RPC endpoint URL
 * @param timeoutMs - Request timeout in milliseconds (default: 10000)
 */
export async function fetchAztecNodeInfo(
  url: string,
  timeoutMs = 10000
): Promise<AztecNodeInfo | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'node_getNodeInfo',
        params: [],
      } satisfies JsonRpcRequest),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as JsonRpcResponse<AztecNodeInfo>;

    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message}`);
    }

    return data.result ?? null;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fetch block number from an Aztec RPC endpoint
 * @param url - The RPC endpoint URL
 * @param timeoutMs - Request timeout in milliseconds (default: 10000)
 */
export async function fetchAztecBlockNumber(
  url: string,
  timeoutMs = 10000
): Promise<number | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'node_getBlockNumber',
        params: [],
      } satisfies JsonRpcRequest),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as JsonRpcResponse<number>;

    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message}`);
    }

    return data.result ?? null;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Check if node is ready
 * @param url - The RPC endpoint URL
 * @param timeoutMs - Request timeout in milliseconds (default: 5000)
 */
export async function isAztecNodeReady(
  url: string,
  timeoutMs = 5000
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'node_isReady',
        params: [],
      } satisfies JsonRpcRequest),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return false;
    }

    const data = await response.json() as JsonRpcResponse<boolean>;
    return data.result === true;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}
