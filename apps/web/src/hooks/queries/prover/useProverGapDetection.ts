import { useMemo } from 'react';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';
import { useEpochCalculations } from '@/hooks/useEpochCalculations';
import type { ProverSummaryResponse } from '@/types/prover';
import {
  calculateEstimatedScore,
  calculateShares,
  calculateShareMultiplier,
  REWARD_CONFIG,
} from '@/utils/rewardCalculations';

export interface ProverGapInfo {
  currentEpoch: number;
  lastActiveEpoch: number;
  epochsSinceLastProof: number;
  isInactive: boolean;
  estimatedScoreLost: number;
  estimatedCurrentScore: number;
  estimatedShares: number;
  estimatedMultiplier: number;
  decayPerEpoch: number;
}

/**
 * Hook to detect gaps in prover activity based on current epoch calculations
 * Calculates the gap between the current epoch and the last proof submission
 * Uses accurate RewardBooster contract formulas
 */
export function useProverGapDetection(
  summary: ProverSummaryResponse | null | undefined
): ProverGapInfo {
  const networkConfigState = useNetworkConfig();
  const { currentEpoch } = useEpochCalculations(networkConfigState);

  return useMemo(() => {
    if (!summary) {
      return {
        currentEpoch: 0,
        lastActiveEpoch: 0,
        epochsSinceLastProof: 0,
        isInactive: false,
        estimatedScoreLost: 0,
        estimatedCurrentScore: 0,
        estimatedShares: REWARD_CONFIG.minimum,
        estimatedMultiplier: 1.0,
        decayPerEpoch: REWARD_CONFIG.decayPerEpoch,
      };
    }

    const lastActiveEpoch = summary.activityScore.lastActiveEpoch;
    const storedScore = summary.activityScore.storedValue;

    // Calculate epochs since last proof
    const epochsSinceLastProof = Math.max(0, currentEpoch - lastActiveEpoch);

    // Calculate estimated score with decay using contract formula
    const estimatedCurrentScore = calculateEstimatedScore(
      storedScore,
      lastActiveEpoch,
      currentEpoch
    );

    // Calculate estimated score lost
    const estimatedScoreLost = storedScore - estimatedCurrentScore;

    // Calculate shares using quadratic formula
    const estimatedShares = calculateShares(estimatedCurrentScore);
    const estimatedMultiplier = calculateShareMultiplier(estimatedShares);

    // Consider inactive if more than 1 epoch has passed
    const isInactive = epochsSinceLastProof > 1;

    return {
      currentEpoch,
      lastActiveEpoch,
      epochsSinceLastProof,
      isInactive,
      estimatedScoreLost,
      estimatedCurrentScore,
      estimatedShares,
      estimatedMultiplier,
      decayPerEpoch: REWARD_CONFIG.decayPerEpoch,
    };
  }, [summary, currentEpoch]);
}
