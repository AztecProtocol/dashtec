import { getProverHistory, getProverStreaks, getProverFinancialMetrics } from '@/db/queries/prover';
import { formatUnits } from 'viem';
import {
  calculateShares,
  calculateShareMultiplier,
  calculateDecayPerHour,
  calculateHoursUntilZero,
  REWARD_CONFIG,
  calculateCurrentEpoch
} from '@/utils/rewardCalculations';
import { getNetworkConfigFromCacheOrContract } from '@/services/networkConfig';

interface ScoreData {
  before: number;
  after: number;
  shares: number;
}

interface HistoryItem {
  epoch: number;
  l2BlockNumber: string;
  timestamp: number;
  txHash: string;
  gasUsed: string;
  gasPrice: string;
  gasCostEth: string;
  gapFromPrevious: number;
  accumulatedProvingEpochs: number;
  accumulatedMissedEpochs: number;
  score: number;
  scoreBefore: number;
  scoreAfter: number;
  shares: number;
}

interface ProverData {
  config: {
    increment: number;
    maxScore: number;
    decayPerEpoch: number;
    maxShares: number;
    minShares: number;
  };
  summary: {
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
  };
  history: {
    data: HistoryItem[];
    total: number;
    currentEpoch: number;
  };
  financial?: {
    costs: {
      totalGasUsed: string;
      totalGasCostEth: string;
      avgGasCostPerProof: string;
    };
    rewards: {
      totalTokensEarned: number;
      avgTokensPerEpoch: number;
    };
  };
}

/**
 * Calculate running scores for all proofs chronologically
 */
function calculateRunningScores(
  chronological: any[],
  currentEpoch: number
): {
  scoresMap: Map<number, ScoreData>;
  finalScore: number;
  lastEpoch: number;
} {
  let currentScore = 0;
  let lastEpoch = -1;
  const scoresMap = new Map<number, ScoreData>();

  for (const row of chronological) {
    const epoch = row.epoch;
    const epochsPassed = lastEpoch === -1 ? 0 : epoch - lastEpoch;

    // Store the score from the previous epoch (before any decay)
    const scoreBeforeProof = currentScore;

    const decay = epochsPassed * REWARD_CONFIG.decayPerEpoch;

    if (epochsPassed > 0) {
      currentScore = Math.max(0, currentScore - decay);
    }

    // Add increment for this proof
    currentScore = Math.min(
      REWARD_CONFIG.maxScore,
      currentScore + REWARD_CONFIG.increment
    );

    const scoreAfterProof = currentScore;
    const shares = calculateShares(scoreAfterProof);

    scoresMap.set(epoch, {
      before: scoreBeforeProof,
      after: scoreAfterProof,
      shares
    });

    lastEpoch = epoch;
  }

  return { scoresMap, finalScore: currentScore, lastEpoch };
}

/**
 * Format history data with calculated scores
 */
function formatHistoryData(
  results: any[],
  scoresMap: Map<number, ScoreData>,
  currentEpoch: number,
  lastEpoch: number
): HistoryItem[] {
  const historyData: HistoryItem[] = results.map((row) => {
    const gasUsed = row.transaction_gas.toString();
    const gasPrice = row.transaction_max_fee_per_gas || row.transaction_gas_price || 0n;
    const gasCostWei = BigInt(row.transaction_gas * gasPrice);
    const gasCostEth = formatUnits(gasCostWei, 18);

    const scores = scoresMap.get(row.epoch) || { before: 0, after: 0, shares: 0 };

    return {
      epoch: row.epoch,
      l2BlockNumber: row.l2_block_number.toString(),
      timestamp: Number(row.timestamp),
      txHash: row.transaction_hash,
      gasUsed,
      gasPrice: gasPrice.toString(),
      gasCostEth,
      gapFromPrevious: Number(row.gap_from_previous),
      accumulatedProvingEpochs: Number(row.accumulated_proving_epochs),
      accumulatedMissedEpochs: Number(row.accumulated_missed_epochs),
      score: scores.after,
      scoreBefore: scores.before,
      scoreAfter: scores.after,
      shares: scores.shares
    };
  });

  return historyData;
}

/**
 * Get comprehensive prover data including summary, history, and financial metrics
 */
export async function getProverData(proverAddress: string, rollupAddresses: string[]): Promise<ProverData> {
  const normalizedAddress = proverAddress.toLowerCase();

  // Get network config and current epoch
  const networkConfig = await getNetworkConfigFromCacheOrContract();
  const currentEpoch = calculateCurrentEpoch(
    networkConfig.genesisTime,
    networkConfig.slotDuration,
    networkConfig.epochDurationSlots
  );

  // Get all history
  const results = await getProverHistory(normalizedAddress, rollupAddresses);

  if (results.length === 0) {
    throw new Error('No proofs found for this prover address');
  }

  const total = Number(results[0].total_count);

  // Sort chronologically and calculate scores
  const chronological = [...results].sort((a, b) => a.epoch - b.epoch);
  const { scoresMap, finalScore, lastEpoch } = calculateRunningScores(chronological, currentEpoch);

  // Format history data
  const historyData = formatHistoryData(results, scoresMap, currentEpoch, lastEpoch);

  // Calculate final current score with decay to current epoch
  const last = scoresMap.get(lastEpoch)
  const firstProofEpoch = chronological[0].epoch;
  const lastProofEpoch = lastEpoch;
  const finalCurrentScore = last?.after || 0

  // Get streaks
  const streaks = await getProverStreaks(normalizedAddress, lastProofEpoch, rollupAddresses);

  // Calculate summary data
  const currentShares = calculateShares(finalCurrentScore);
  const shareMultiplier = calculateShareMultiplier(currentShares);
  const decayPerHour = calculateDecayPerHour(24);
  const hoursUntilZero = calculateHoursUntilZero(finalCurrentScore, 24);

  const summary = {
    proverAddress: normalizedAddress,
    currentEpoch,
    activityScore: {
      lastActiveEpoch: lastProofEpoch,
      storedValue: finalScore,
      currentScore: finalCurrentScore,
      currentShares,
      shareMultiplier,
      decayPerHour,
      hoursUntilZero
    },
    stats: {
      totalProofsSubmitted: results.length,
      firstProofEpoch,
      lastProofEpoch,
      longestStreak: Number(streaks.longest_streak || 0),
      currentStreak: Number(streaks.current_streak || 0)
    }
  };

  // Get financial metrics
  const financialMetrics = await getProverFinancialMetrics(normalizedAddress, rollupAddresses);

  const financial = {
    costs: {
      totalGasUsed: financialMetrics?.total_gas_used.toString() || '0',
      totalGasCostEth: formatUnits(financialMetrics?.total_gas_cost_wei || 0n, 18),
      avgGasCostPerProof: formatUnits(BigInt(Math.floor(financialMetrics?.avg_gas_cost_per_proof_wei || 0)), 18)
    },
    rewards: {
      totalTokensEarned: 0, // TODO: Calculate from contract
      avgTokensPerEpoch: 0
    }
  };

  return {
    config: {
      increment: REWARD_CONFIG.increment,
      maxScore: REWARD_CONFIG.maxScore,
      decayPerEpoch: REWARD_CONFIG.decayPerEpoch,
      maxShares: REWARD_CONFIG.k,
      minShares: REWARD_CONFIG.minimum
    },
    summary,
    history: {
      data: historyData,
      total,
      currentEpoch
    },
    financial
  };
}
