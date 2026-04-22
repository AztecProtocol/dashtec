export interface AddToQueueParams {
  attesterAddress: string;
  withdrawerAddress: string;
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
  queuedAt: bigint;
}

export interface RemoveFromQueueParams {
  attesterAddress: string;
  withdrawerAddress: string;
  eventType: 'Deposit' | 'FailedDeposit';
}
