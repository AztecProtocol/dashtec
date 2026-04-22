import { ValidatorPerformance, ValidatorTableSummary } from '@/types';

/**
 * Calculates performance scores for a list of validators based on a weighted formula.
 */
export function calculatePerformanceScores(
  validatorsData: ValidatorTableSummary[],
  externalMaxTotalAttestations?: number,
  externalMaxTotalBlocksProduced?: number
): ValidatorPerformance[] {
  // Define the weights for the performance score calculation.
  const W_ATTESTATION_VOLUME = 0.25;
  const W_ATTESTATION_RATE = 0.35;
  const W_BLOCK_PRODUCTION_VOLUME = 0.20;
  const W_BLOCK_PRODUCTION_EFFICIENCY = 0.20;

  let maxTotalAttestations = externalMaxTotalAttestations || 0;
  let maxTotalBlocksProduced = externalMaxTotalBlocksProduced || 0;

  // First pass: Calculate intermediate metrics and find maximums for normalization (if not provided externally).
  const scoredValidators = validatorsData.map(v => {
    const totalAttestations = v.total_attestations_successful + v.total_attestations_missed;
    if (!externalMaxTotalAttestations && totalAttestations > maxTotalAttestations) {
      maxTotalAttestations = totalAttestations;
    }
    const attestationSuccessRate = totalAttestations > 0 ? v.total_attestations_successful / totalAttestations : 0;

    const totalBlocksProduced = v.total_checkpoints_proposed + v.total_checkpoints_mined;
    if (!externalMaxTotalBlocksProduced && totalBlocksProduced > maxTotalBlocksProduced) {
      maxTotalBlocksProduced = totalBlocksProduced;
    }
    const totalBlockOpportunities = totalBlocksProduced + (v.total_checkpoints_missed || 0) + v.total_blocks_missed;
    const blockProductionEfficiency = totalBlockOpportunities > 0 ? totalBlocksProduced / totalBlockOpportunities : 0;

    return { ...v, totalAttestations, attestationSuccessRate, totalBlocksProduced, blockProductionEfficiency, score: 0 };
  });

  // Second pass: Calculate the final normalized score.
  const rankedValidators = scoredValidators.map(v => {
    const normAttestationVol = maxTotalAttestations > 0 ? v.totalAttestations / maxTotalAttestations : 0;
    const normBlockProdVol = maxTotalBlocksProduced > 0 ? v.totalBlocksProduced / maxTotalBlocksProduced : 0;

    const score =
      (normAttestationVol * W_ATTESTATION_VOLUME) +
      (v.attestationSuccessRate * W_ATTESTATION_RATE) +
      (normBlockProdVol * W_BLOCK_PRODUCTION_VOLUME) +
      (v.blockProductionEfficiency * W_BLOCK_PRODUCTION_EFFICIENCY);

    const displayAttestationSuccessRate = v.totalAttestations > 0 ? (v.attestationSuccessRate * 100).toFixed(1) + '%' : 'N/A';

    const totalProduced = v.total_checkpoints_mined + v.total_checkpoints_proposed;
    const totalOpportunities = totalProduced + (v.total_checkpoints_missed || 0) + v.total_blocks_missed;
    const proposalSuccessRate = totalOpportunities > 0 ? ((totalProduced / totalOpportunities) * 100).toFixed(1) + '%' : 'N/A';

    let lastProposedDisplay = 'N/A';
    if (v.max_epoch_with_checkpoints_proposed > 0) {
      lastProposedDisplay = `Epoch #${v.max_epoch_with_checkpoints_proposed}`;
    } else if (v.max_epoch_with_checkpoints_mined > 0) {
      lastProposedDisplay = `Epoch #${v.max_epoch_with_checkpoints_mined} (Mined)`;
    }

    // Map to the final ValidatorPerformance type for the frontend.
    return {
      index: `#${v.validator_hex_index.toUpperCase()}`,
      address: v.address,
      status: v.status as any,
      balance: Number(v.stake_balance) || 0,
      attestationSuccess: displayAttestationSuccessRate,
      proposalSuccess: proposalSuccessRate,
      lastProposed: lastProposedDisplay,
      performanceScore: parseFloat(score.toFixed(3)),
      totalAttestationsSucceeded: v.total_attestations_successful,
      totalAttestationsMissed: v.total_attestations_missed,
      totalCheckpointsProposed: v.total_checkpoints_proposed,
      totalCheckpointsMined: v.total_checkpoints_mined,
      totalBlocksMissed: v.total_blocks_missed,
      totalParticipatingEpochs: v.total_participating_epochs,
      x_handle: v.x_handle || undefined,
      x_user_id: v.x_user_id || undefined,
      x_image_url: v.x_image_url || undefined,
      name: v.name || undefined,
      discordUsername: v.discordUsername || undefined,
      discordAvatar: v.discordAvatar || undefined,
      discordId: v.discordId || undefined,
      provider: v.provider || undefined,
      rank: 0
    };
  });

  // Third pass: Sort by performance score and assign ranks
  rankedValidators.sort((a, b) => b.performanceScore - a.performanceScore);

  // Assign ranks based on sorted order
  rankedValidators.forEach((validator, index) => {
    validator.rank = index + 1;
  });


  return rankedValidators;
}