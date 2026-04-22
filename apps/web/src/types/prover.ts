/**
 * Prover API response types
 */

export interface ProverSummaryResponse {
  proverAddress: string;
  currentEpoch: number;
  activityScore: {
    lastActiveEpoch: number;
    storedValue: number;
    currentScore: number;
    currentShares: number;
    shareMultiplier: number;
    decayPerHour: number;
    hoursUntilZero: number;
  };
  stats: {
    totalProofsSubmitted: number;
    firstProofEpoch: number;
    lastProofEpoch: number;
    longestStreak: number;
    currentStreak: number;
  };
  benchmark?: number;
  status?: string;
}

export interface ProofHistoryItem {
  epoch: number;
  l2BlockNumber: string;
  timestamp: number;
  txHash: string;
  gasUsed: string;
  gasPrice: string;
  gasCostEth: string;
  gasCostUsd: number;
  gapFromPrevious: number;
  accumulatedProvingEpochs: number;
  accumulatedMissedEpochs: number;
  score: number;
  scoreBefore: number;
  scoreAfter: number;
  shares: number;
}

export interface ProverHistoryResponse {
  data: ProofHistoryItem[];
  total: number;
  currentEpoch: number;
  benchmark?: number;
  status: string;
}

export interface ProverGap {
  startEpoch: number;
  endEpoch: number;
  gapSize: number;
  scoreLost: number;
  impactSeverity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProverGapsResponse {
  gaps: ProverGap[];
  summary: {
    totalGaps: number;
    totalScoreLost: number;
    averageGapSize: number;
    largestGap: number;
  };
  benchmark?: number;
  status: string;
}

export interface ProverFinancialResponse {
  costs: {
    totalGasUsed: string;
    totalGasCostEth: string;
    avgGasCostPerProof: string;
    totalGasCostUsd: number;
  };
  rewards: {
    totalTokensEarned: number;
    tokenPrice: number;
    totalRewardsUsd: number;
    avgTokensPerEpoch: number;
  };
  profitability: {
    netProfitUsd: number;
    roi: number;
    breakEvenTokenPrice: number;
    costPerEpoch: number;
    revenuePerEpoch: number;
  };
  benchmark?: number;
  status: string;
}

export interface ProverEpochsResponse {
  epochs: number[];
  count: number;
  benchmark?: number;
  status: string;
}

export interface ProverProjectionsResponse {
  current: {
    score: number;
    shares: number;
    multiplier: number;
  };
  target: {
    score: number;
    shares: number;
    multiplier: number;
  };
  path: {
    scoreNeeded: number;
    epochsNeeded: number;
    daysNeeded: number;
    estimatedGasCost: number;
    estimatedGasCostEth: string;
  };
  breakEven: {
    epochsAtMaxShares: number;
    daysAtMaxShares: number;
    totalDaysToBreakEven: number;
  };
  benchmark?: number;
  status: string;
}

export interface TimelineItem {
  period: string;
  proofCount: number;
  totalGas: string;
  avgGasPrice: string;
}

export interface ProverTimelineResponse {
  timeline: TimelineItem[];
  groupBy: 'epoch' | 'day' | 'week';
  benchmark?: number;
  status: string;
}

export interface ProverHistoryParams {
  fromEpoch?: number;
  toEpoch?: number;
}

export interface ProverProjectionsParams {
  currentScore: number;
  targetScore?: number;
}

export interface ProverTimelineParams {
  groupBy?: 'epoch' | 'day' | 'week';
}

export interface ProverEpochsParams {
  sortOrder?: 'asc' | 'desc';
}

/* ── Network-wide prover types ── */

export interface ProverMarketShareItem {
  proverId: string;
  totalProofs: number;
  percentage: number;
  firstEpoch: number;
  lastEpoch: number;
  uniqueEpochs: number;
}

export interface ProverMarketShareResponse {
  provers: ProverMarketShareItem[];
  totalProofs: number;
  benchmark?: number;
  status: string;
}

export interface NetworkTimelineItem {
  period: string;
  proofCount: number;
  uniqueProvers: number;
  totalGas: string;
}

export interface NetworkActivityTimelineResponse {
  timeline: NetworkTimelineItem[];
  groupBy: 'epoch' | 'day' | 'week';
  benchmark?: number;
  status: string;
}

export interface ProverLeaderboardItem {
  proverId: string;
  totalProofs: number;
  firstEpoch: number;
  lastEpoch: number;
  rank: number;
}

export interface ProverLeaderboardResponse {
  provers: ProverLeaderboardItem[];
  benchmark?: number;
  status: string;
}

export interface NetworkProvingHealthResponse {
  totalProofs: number;
  uniqueProvers: number;
  epochsWithProofs: number;
  firstEpoch: number;
  lastEpoch: number;
  avgProofsPerEpoch: number;
  decentralizationIndex: number;
  benchmark?: number;
  status: string;
}
