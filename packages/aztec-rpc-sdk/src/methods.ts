/**
 * Aztec RPC Methods
 *
 * Typed methods for Aztec Node JSON-RPC API
 * @see https://docs.aztec.network/the_aztec_network/reference/node_api_reference
 */
import type { AztecRpcClient } from './client';
import type {
  AztecNodeInfo,
  WorldStateSyncStatus,
  L2Tips,
  Block,
  BlockHeader,
  ValidatorsStatsResult,
  ValidatorStatsResult,
  TxReceipt,
  TxEffect,
  L1ContractAddresses,
  ProtocolContractAddresses,
  GasFees,
  ContractClass,
  LogFilter,
  LogsResponse,
} from './types';

/**
 * Create typed RPC methods for an Aztec client
 */
export function createAztecMethods(client: AztecRpcClient) {
  return {
    // ========================================================================
    // Node Information
    // ========================================================================

    /** Check if node is ready */
    isReady: () => client.request<boolean>('node_isReady'),

    /** Get node information */
    getNodeInfo: () => client.request<AztecNodeInfo>('node_getNodeInfo'),

    /** Get node version */
    getNodeVersion: () => client.request<string>('node_getNodeVersion'),

    /** Get protocol version */
    getVersion: () => client.request<number>('node_getVersion'),

    /** Get L1 chain ID */
    getChainId: () => client.request<number>('node_getChainId'),

    /** Get L1 contract addresses */
    getL1ContractAddresses: () => client.request<L1ContractAddresses>('node_getL1ContractAddresses'),

    /** Get protocol contract addresses */
    getProtocolContractAddresses: () => client.request<ProtocolContractAddresses>('node_getProtocolContractAddresses'),

    /** Get ENR */
    getEncodedEnr: () => client.request<string>('node_getEncodedEnr'),

    /** Get current base fees (feePerDaGas and feePerL2Gas are strings) */
    getCurrentBaseFees: () => client.request<GasFees>('node_getCurrentBaseFees'),

    // ========================================================================
    // Block Queries
    // ========================================================================

    /** Get latest block number */
    getBlockNumber: () => client.request<number>('node_getBlockNumber'),

    /** Get proven block number */
    getProvenBlockNumber: () => client.request<number>('node_getProvenBlockNumber'),

    /** Get L2 tips (latest, proven, finalized) */
    getL2Tips: () => client.request<L2Tips>('node_getL2Tips'),

    /** Get block by number */
    getBlock: (blockNumber: number) => client.request<Block>('node_getBlock', [blockNumber]),

    /** Get blocks by range */
    getBlocks: (from: number, limit: number) => client.request<unknown[]>('node_getBlocks', [from, limit]),

    /** Get block header */
    getBlockHeader: (blockNumber: number) => client.request<BlockHeader>('node_getBlockHeader', [blockNumber]),

    // ========================================================================
    // World State
    // ========================================================================

    /** Get world state sync status */
    getWorldStateSyncStatus: () => client.request<WorldStateSyncStatus>('node_getWorldStateSyncStatus'),

    /** Get public storage at address/slot */
    getPublicStorageAt: (address: string, slot: string) =>
      client.request<string>('node_getPublicStorageAt', [address, slot]),

    // ========================================================================
    // Validator Queries
    // ========================================================================

    /** Get all validators stats */
    getValidatorsStats: () => client.request<ValidatorsStatsResult>('node_getValidatorsStats'),

    /** Get stats for a specific validator (with performance history) */
    getValidatorStats: (address: string) => client.request<ValidatorStatsResult>('node_getValidatorStats', [address]),

    // ========================================================================
    // Transaction Operations
    // ========================================================================

    /** Get transaction receipt */
    getTxReceipt: (txHash: string) => client.request<TxReceipt>('node_getTxReceipt', [txHash]),

    /** Get transaction effect */
    getTxEffect: (txHash: string) => client.request<TxEffect>('node_getTxEffect', [txHash]),

    /** Get transaction by hash */
    getTxByHash: (txHash: string) => client.request<unknown>('node_getTxByHash', [txHash]),

    /** Get pending transactions */
    getPendingTxs: () => client.request<unknown[]>('node_getPendingTxs'),

    /** Get pending transaction count */
    getPendingTxCount: () => client.request<number>('node_getPendingTxCount'),

    // ========================================================================
    // Contract Queries
    // ========================================================================

    /** Get contract class by ID */
    getContractClass: (classId: string) => client.request<ContractClass>('node_getContractClass', [classId]),

    /** Get contract by address */
    getContract: (address: string) => client.request<unknown>('node_getContract', [address]),

    // ========================================================================
    // Log Queries (use filter object per Aztec API docs)
    // ========================================================================

    /** Get private logs with filter */
    getPrivateLogs: (filter: LogFilter) =>
      client.request<LogsResponse>('node_getPrivateLogs', [filter]),

    /** Get public logs with filter */
    getPublicLogs: (filter: LogFilter) =>
      client.request<LogsResponse>('node_getPublicLogs', [filter]),

    /** Get contract class logs with filter */
    getContractClassLogs: (filter: LogFilter) =>
      client.request<LogsResponse>('node_getContractClassLogs', [filter]),
  };
}

export type AztecMethods = ReturnType<typeof createAztecMethods>;
