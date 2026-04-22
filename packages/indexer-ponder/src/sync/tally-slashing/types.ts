import type { IndexingFunctionArgs } from 'ponder:registry';

export interface SyncVoteCastParams {
  client: IndexingFunctionArgs['context']['client'];
  roundNumber: number;
  slotNumber: bigint;
  proposerAddress: string;
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
  timestamp: string;
  voteDate: bigint;
  contractAddress: string;
}

export interface SyncRoundExecutedParams {
  roundNumber: number;
  slashCount: number;
  payloadAddress: string | null;
  totalSlashAmount: string | null;
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
  timestamp: string;
  executedDate: bigint;
  contractAddress: string;
}

export interface SyncSlashSlashedParams {
  attesterAddress: string;
  amount: string;
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
  timestamp: string;
  slashedDate: bigint;
  contractAddress: string;
}

export interface SyncTallySlashTargetCommitteesParams {
  roundNumber: number;
  committees: readonly (readonly string[])[];
  contractAddress: string;
  rollupInstance: string;
  rollupAddress: string;
  blockNumber: bigint;
}

export interface SyncTallySlashActionsParams {
  roundNumber: number;
  tallyResults: Array<{ attester: string; amount: bigint }>;
  payloadAddress: string | null;
  deploymentTxHash: string;
  deploymentBlock: bigint;
  executedAt: Date;
  contractAddress: string;
  tallyBlockNumber: bigint;
  rollupAddress: string;
}
