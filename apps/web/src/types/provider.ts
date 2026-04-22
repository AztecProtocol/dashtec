export interface ProviderAttester {
  address: string;
  addedAt: Date;
  validator: {
    name: string | null;
    status: string;
    balance: string | null;
    xHandle: string | null;
    xImageUrl: string | null;
    discordUsername: string | null;
    discordAvatar: string | null;
  } | null;
  performance: {
    attestationsSuccessful: number;
    attestationsMissed: number;
    attestationRate: string;
    checkpointsProposed: number;
    checkpointsMined: number;
    checkpointsMissed: number;
    blocksMissed: number;
    checkpointSuccessRate: string;
  };
}

export interface ProviderStats {
  totalAttesters: number;
  activeAttesters: number;
  totalStaked: string;
  attestationRate: string;
  blockSuccessRate: string;
  totalAttestationsSuccessful: number;
  totalAttestationsMissed: number;
  totalBlocksProposed: number;
  totalBlocksMissed: number;
}

export interface Provider {
  id: string;
  identifier: string;
  admin: string;
  takeRate: number;
  rewardsRecipient: string;
  createdAt: Date;
  blockNumber: string;
  txHash: string;
  attesters: ProviderAttester[];
  stats: ProviderStats;
}

export interface ProviderListItem {
  id: string;
  identifier: string;
  admin: string;
  takeRate: number;
  rewardsRecipient: string;
  createdAt: Date;
  stats: {
    totalAttesters: number;
    activeAttesters: number;
    totalStaked: string;
  };
}
