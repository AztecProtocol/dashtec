export interface SyncSignalCastParams {
  signalerAddress: string;
  payloadAddress: string;
  roundNumber: number;
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
  timestamp: string;
  voteDate: bigint;
  contractAddress: string;
}

export interface SyncPayloadSubmittableParams {
  payloadAddress: string;
  roundNumber: number;
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
  timestamp: string;
  contractAddress: string;
}

export interface SyncPayloadSubmittedParams {
  payloadAddress: string;
  roundNumber: number;
  submitterAddress: string;
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
  timestamp: string;
  contractAddress: string;
}
