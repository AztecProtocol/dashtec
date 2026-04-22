export type PerformanceHistoryRow = {
  validator_address: string;
  epoch_number: string;
  attestations_successful: number;
  attestations_missed: number;
  checkpoints_proposed: number;
  checkpoints_mined: number;
  checkpoints_missed: number;
  blocks_missed: number;
};

export type StatusCountRow = {
  status: string;
  count: string;
};

export type PerformanceHistoryOptions = {
  limit?: number;
  rollupAddresses?: string[];
};
