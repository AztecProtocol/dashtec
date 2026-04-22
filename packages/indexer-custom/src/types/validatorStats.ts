/**
 * Validator Stats Types
 *
 * Types for validator statistics from RPC and internal processing
 */

export interface ValidatorStatHistoryItem {
  slot: number;
  status: string;
}

export interface ValidatorStatDetail {
  address: string;
  validator_hex_index?: string;
  history: ValidatorStatHistoryItem[];
}

export interface ValidatorStatsRpcResult {
  stats: Record<string, ValidatorStatDetail>;
  lastProcessedSlot: number;
  initialSlot: number;
  slotWindow: number;
}

export interface ValidatorStatsRpcResponse {
  jsonrpc: string;
  id: number;
  result: ValidatorStatsRpcResult;
}

export interface ValidatorAttestationData {
  slot_number: bigint;
  epoch_number: bigint;
  validator_address: string;
  timestamp: Date;
  status: string;
  committee_index?: number;
}

export interface ValidatorMinimalData {
  address: string;
  last_updated_at: Date;
  validator_hex_index?: string;
}
