export type {
  Validator,
  ValidatorStatusEnum,
  ValidatorHistoryEnum,
  ValidatorEpochPerformanceData,
  ValidatorPerformance,
  ValidatorCurrentEpochActivity,
  ValidatorEpochSlotActivity,
  ValidatorTableSummary,
  VotingHistoryEntry,
  TallyVotingHistoryEntry,
  ProposalHistoryEntry,
  AttestationHistoryEntry,
  RewardSource,
  RollupRewardsGroup,
  ProviderMetadata,
  SlotActivity,
  SlotActivityStatus,
  ValidatorJourneyEvent,
} from './validator';

export interface KeyMetricCardProps {
  title: string;
  value: string | React.ReactNode;
  subtext: string | React.ReactNode;
  valueColor?: string;
  Icon?: React.ElementType;
  subtextButton?: {
    label: string;
    onClick?: () => void;
  };
}

export interface EpochAttestationMetrics {
  epochNumber: number;
  successCount: number;
  missCount: number;
  totalAttestations: number;
  epochBlockProducedVolume?: number;
  epochBlockMissedVolume?: number;
  attestationRate?: number;
  blockProductionRate?: number;
  validatorCommitteeSize?: number;
  validatorCommitteeList?: string[]
}

export interface DetailItemProps {
  label: string;
  value: string | number | null | undefined | React.ReactNode;
  isMono?: boolean;
  highlight?: boolean;
  Icon?: React.ElementType;
  textToCopy?: string | null;
  tooltip?: string;
}

export interface NetworkConfig {
  genesisTime: number;
  slotDuration: number;
  epochDurationSlots: number;
  stakingTokenSymbol: string;
  stakingTokenDecimals: number;
  minimumStake: string;
  depositAmount: string;
}

export type { ProviderListItem, ProviderAttester, ProviderDetail, ProvidersApiResponse, ProviderDetailApiResponse, ProviderAggregates } from './api/providers';
export type { QueuedValidator, QueueStats, QueueApiResponse, QueueStatsResponse, ValidatorQueueParams } from './api/queue';