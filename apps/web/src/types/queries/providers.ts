export type ProviderWithAttestersRow = {
  id: string;
  providerIdentifier: string;
  providerName: string;
  providerAdmin: string;
  providerTakeRate: number;
  rewardsRecipient: string;
  blockNumber: bigint;
  txHash: string;
  timestamp: bigint;
  metadataName: string | null;
  metadataDescription: string | null;
  metadataWebsite: string | null;
  metadataLogoUrl: string | null;
  metadataEmail: string | null;
  metadataDiscord: string | null;
  total_attesters: bigint;
  active_attesters: bigint;
  queued_attesters: bigint;
  active_staked: bigint;
  total_staked: bigint;
};

export type ProviderByIdentifierRow = {
  id: string;
  providerIdentifier: string;
  providerAdmin: string;
  providerTakeRate: number;
  rewardsRecipient: string;
  blockNumber: bigint;
  txHash: string;
  timestamp: bigint;
  metadataName: string | null;
  metadataDescription: string | null;
  metadataWebsite: string | null;
  metadataLogoUrl: string | null;
  metadataEmail: string | null;
  metadataDiscord: string | null;
};

export type ProviderAttesterRow = {
  id: string;
  providerIdentifier: string;
  attesterAddress: string;
  timestamp: bigint;
  blockNumber: bigint;
  txHash: string;
  last_event: string;
  name: string | null;
  validator_hex_index: string | null;
  status: string | null;
  stake_balance: bigint | null;
  x_handle: string | null;
  x_image_url: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  is_in_queue: boolean;
  migration_status: string | null;
};

export type ProviderPerformanceRow = {
  validator_address: string;
  total_attestations_successful: bigint;
  total_attestations_missed: bigint;
  total_checkpoints_proposed: bigint;
  total_checkpoints_mined: bigint;
  total_checkpoints_missed: bigint;
  total_blocks_missed: bigint;
};

export type ProviderStatsRow = {
  total_attesters: bigint;
  active_attesters: bigint;
  total_staked: bigint;
  total_attestations_successful: bigint;
  total_attestations_missed: bigint;
  total_checkpoints_proposed: bigint;
  total_checkpoints_mined: bigint;
  total_checkpoints_missed: bigint;
  total_blocks_missed: bigint;
};

export type NetworkAggregatesRow = {
  total_sequencers: bigint;
  active_sequencers: bigint;
  total_staked: bigint;
  active_staked: bigint;
};
