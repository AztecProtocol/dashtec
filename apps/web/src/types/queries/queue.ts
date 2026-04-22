export type QueueWithRankRow = {
  attester_address: string;
  withdrawer_address: string;
  transaction_hash: string;
  queued_at: Date;
  provider_identifier: string;
  provider_name: string;
  provider_logo_url: string;
  rank: bigint;
};

export type QueueCountRow = {
  total: bigint;
};
