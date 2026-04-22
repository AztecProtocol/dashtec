/**
 * Aztec Node RPC Types
 *
 * Type definitions for Aztec Node JSON-RPC API
 * Verified against actual RPC responses
 */

// ============================================================================
// JSON-RPC Base Types
// ============================================================================

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown[];
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number | string;
  result?: T;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// ============================================================================
// L1 Contract Addresses
// ============================================================================

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

// ============================================================================
// Protocol Contract Addresses
// ============================================================================

export interface ProtocolContractAddresses {
  classRegistry: string;
  feeJuice: string;
  instanceRegistry: string;
  multiCallEntrypoint: string;
}

// ============================================================================
// Node Information
// ============================================================================

export interface AztecNodeInfo {
  nodeVersion: string;
  l1ChainId: number;
  rollupVersion: number;
  enr: string;
  l1ContractAddresses: L1ContractAddresses;
  protocolContractAddresses: ProtocolContractAddresses;
}

export interface WorldStateSyncStatus {
  latestBlockNumber: number;
  latestBlockHash: string;
  finalizedBlockNumber: number;
  oldestHistoricBlockNumber: number;
  treesAreSynched: boolean;
}

// ============================================================================
// L2 Tips
// ============================================================================

export interface L2Tips {
  latest: { number: number; hash: string };
  proven: { number: number; hash: string };
  finalized: { number: number; hash: string };
}

// ============================================================================
// Gas Fees
// ============================================================================

export interface GasFees {
  feePerDaGas: string;
  feePerL2Gas: string;
}

// ============================================================================
// Block Types
// ============================================================================

export interface MerkleTreeInfo {
  root: string;
  nextAvailableLeafIndex: number;
}

export interface GlobalVariables {
  chainId: string;
  version: string;
  blockNumber: number;
  slotNumber: string;
  timestamp: string;
  coinbase: string;
  feeRecipient: string;
  gasFees: GasFees;
}

export interface ContentCommitment {
  blobsHash: string;
  inHash: string;
  outHash: string;
}

export interface PartialState {
  noteHashTree: MerkleTreeInfo;
  nullifierTree: MerkleTreeInfo;
  publicDataTree: MerkleTreeInfo;
}

export interface BlockState {
  l1ToL2MessageTree: MerkleTreeInfo;
  partial: PartialState;
}

/** Verified response from node_getBlockHeader */
export interface BlockHeader {
  lastArchive: MerkleTreeInfo;
  contentCommitment: ContentCommitment;
  state: BlockState;
  globalVariables: GlobalVariables;
  totalFees: string;
  totalManaUsed: string;
}

/** Verified response from node_getBlock */
export interface Block {
  archive: MerkleTreeInfo;
  header: BlockHeader;
  body: {
    txEffects: TxEffect[];
  };
  blockHash: string;
}

// ============================================================================
// Validator Stats
// ============================================================================

export interface ValidatorHistoryItem {
  slot: number;
  status: 'checkpoint-mined' | 'checkpoint-proposed' | 'checkpoint-missed' | 'blocks-missed' | 'attestation-sent' | 'attestation-missed';
}

export interface MissedStats {
  currentStreak: number;
  rate?: number;
  count: number;
  total: number;
}

/** Verified response from node_getValidatorsStats */
export interface ValidatorStats {
  address: string;
  totalSlots: number;
  missedProposals: MissedStats;
  missedAttestations: MissedStats;
  history: ValidatorHistoryItem[];
}

export interface ValidatorsStatsResult {
  stats: Record<string, ValidatorStats>;
  lastProcessedSlot: number;
  initialSlot: number;
  slotWindow: number;
}

/** Epoch performance data for a validator */
export interface EpochPerformance {
  epoch: string;
  missed: number;
  total: number;
}

/** Result from node_getValidatorStats (single validator) */
export interface ValidatorStatsResult {
  validator: ValidatorStats;
  allTimeProvenPerformance: EpochPerformance[];
  lastProcessedSlot: string;
  initialSlot: string;
  slotWindow: number;
}

// ============================================================================
// Transaction Types
// ============================================================================

export interface TxEffect {
  // Full structure TBD - depends on actual tx data
  [key: string]: unknown;
}

/** Verified response from node_getTxReceipt */
export interface TxReceipt {
  txHash: string;
  status: 'success' | 'reverted' | 'dropped';
  error?: string;
  blockHash?: string;
  blockNumber?: number;
}

// ============================================================================
// Contract Types
// ============================================================================

/** Verified response from node_getContractClass */
export interface ContractClass {
  id: string;
  l2BlockNumber: number;
  version: number;
  artifactHash: string;
  privateFunctions: unknown[];
  utilityFunctions: unknown[];
  packedBytecode: string;
  privateFunctionsRoot: string;
}

// ============================================================================
// Log Filter Types
// ============================================================================

/** Log ID reference for pagination */
export interface LogId {
  blockNumber: number;
  txIndex: number;
  logIndex: number;
}

/** Filter for querying logs */
export interface LogFilter {
  /** Start from this log (for pagination) */
  afterLog?: LogId | null;
  /** Query from this block */
  fromBlock?: number;
  /** Query to this block */
  toBlock?: number;
  /** Filter by contract address */
  contractAddress?: string;
  /** Maximum number of logs to return */
  maxLogs?: number;
}

/** Response from log queries */
export interface LogsResponse {
  logs: unknown[];
  maxLogsHit: boolean;
}

// ============================================================================
// Client Options
// ============================================================================

export interface AztecRpcClientOptions {
  /** RPC endpoint URL */
  url: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retries (default: 3) */
  retries?: number;
  /** Retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
}
