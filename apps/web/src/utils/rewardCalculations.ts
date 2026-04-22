/**
 * Reward calculation utilities based on RewardBooster contract
 *
 * Configuration:
 * - increment: 125,000 (score gain per proof)
 * - maxScore: 15,000,000 (max activity score)
 * - decayPerEpoch: 100,000 (score loss per inactive epoch)
 * - k: 1,000,000 (max shares)
 * - a: 1,000 (quadratic coefficient)
 * - minimum: 100,000 (minimum shares)
 */

export const REWARD_CONFIG = {
  increment: 125_000,
  maxScore: 15_000_000,
  decayPerEpoch: 100_000,
  k: 1_000_000,
  a: 1_000,
  minimum: 100_000,
} as const;

/**
 * Calculate shares from activity score using quadratic formula
 * Formula: shares = max(k - (a × t²) / 10^10, minimum)
 * where t = maxScore - currentScore
 */
export function calculateShares(activityScore: number): number {
  if (activityScore >= REWARD_CONFIG.maxScore) {
    return REWARD_CONFIG.k;
  }

  const t = REWARD_CONFIG.maxScore - activityScore;
  const rhs = (REWARD_CONFIG.a * t * t) / 1e10;

  // Ensure we don't go below 0
  if (REWARD_CONFIG.k < rhs) {
    return REWARD_CONFIG.minimum;
  }

  return Math.max(REWARD_CONFIG.k - rhs, REWARD_CONFIG.minimum);
}

/**
 * Calculate share multiplier from shares
 * Formula: multiplier = shares / 100,000
 */
export function calculateShareMultiplier(shares: number): number {
  return shares / 100_000;
}

/**
 * Calculate estimated current score with decay applied
 * Formula: score = max(0, storedScore - (epochsSinceLastProof × decayPerEpoch))
 */
export function calculateEstimatedScore(
  storedScore: number,
  lastActiveEpoch: number,
  currentEpoch: number
): number {
  const epochsSinceLastProof = Math.max(0, currentEpoch - lastActiveEpoch);
  const decrease = epochsSinceLastProof * REWARD_CONFIG.decayPerEpoch;

  return Math.max(0, storedScore - decrease);
}

/**
 * Calculate decay per hour
 * Assuming 24 hours per epoch
 */
export function calculateDecayPerHour(epochDurationHours: number = 24): number {
  return REWARD_CONFIG.decayPerEpoch / epochDurationHours;
}

/**
 * Calculate hours until score reaches zero
 */
export function calculateHoursUntilZero(
  currentScore: number,
  epochDurationHours: number = 24
): number {
  const decayPerHour = calculateDecayPerHour(epochDurationHours);

  if (decayPerHour === 0) {
    return Infinity;
  }

  return currentScore / decayPerHour;
}

/**
 * Calculate net score gain per proof considering decay
 * Net gain = increment - (decayPerEpoch × epochsGap)
 */
export function calculateNetGainPerProof(epochsGap: number = 1): number {
  return REWARD_CONFIG.increment - (REWARD_CONFIG.decayPerEpoch * epochsGap);
}

/**
 * Calculate epochs needed to reach target score
 * Assumes continuous proving (no gaps)
 */
export function calculateEpochsToTarget(
  currentScore: number,
  targetScore: number
): number {
  const scoreNeeded = Math.max(0, targetScore - currentScore);
  return Math.ceil(scoreNeeded / REWARD_CONFIG.increment);
}

/**
 * Calculate current epoch from network configuration
 */
export function calculateCurrentEpoch(
  genesisTime: number,
  slotDuration: number,
  epochDurationSlots: number
): number {
  const currentTimestamp = Math.floor(Date.now() / 1000);

  if (currentTimestamp < genesisTime) {
    return 0;
  }

  const timeSinceGenesis = currentTimestamp - genesisTime;
  const currentSlot = Math.floor(timeSinceGenesis / slotDuration);
  const currentEpoch = Math.floor(currentSlot / epochDurationSlots);

  return currentEpoch;
}
