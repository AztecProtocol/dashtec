import { VALIDATOR_STATUS } from '@/utils/constants';
import { getValidatorHexIndex } from '@dashtec/shared-utils/validators';
import { stringToBigInt } from '@/utils/bigintHelpers';
import type { ProviderAttester, ProviderDetail } from '@/types';
import type { ProviderDetailBundle } from './providerDetailLoader';

interface AttestationTotals {
  successful: number;
  missed: number;
  total: number;
  ratePct: string;
}

interface BlockTotals {
  proposed: number;
  mined: number;
  checkpointsMissed: number;
  blocksMissed: number;
  successRatePct: string;
}

function computeAttestationTotals(
  successful: number,
  missed: number,
): AttestationTotals {
  const total = successful + missed;
  return {
    successful,
    missed,
    total,
    ratePct: total > 0 ? ((successful / total) * 100).toFixed(2) : '0.00',
  };
}

function computeBlockTotals(
  proposed: number,
  mined: number,
  checkpointsMissed: number,
  blocksMissed: number,
): BlockTotals {
  const opportunities = proposed + mined + checkpointsMissed + blocksMissed;
  return {
    proposed,
    mined,
    checkpointsMissed,
    blocksMissed,
    successRatePct: opportunities > 0
      ? (((proposed + mined) / opportunities) * 100).toFixed(2)
      : '0.00',
  };
}

/** Roll up per-attester performance rows into provider-level totals. */
function aggregateProviderTotals(bundle: ProviderDetailBundle) {
  let attsSuccess = 0;
  let attsMissed = 0;
  let blocksProposed = 0;
  let blocksMined = 0;
  let checkpointsMissed = 0;
  let blocksMissed = 0;

  for (const p of bundle.performance) {
    attsSuccess += Number(p.total_attestations_successful);
    attsMissed += Number(p.total_attestations_missed);
    blocksProposed += Number(p.total_checkpoints_proposed);
    blocksMined += Number(p.total_checkpoints_mined);
    checkpointsMissed += Number(p.total_checkpoints_missed);
    blocksMissed += Number(p.total_blocks_missed);
  }

  return {
    attestation: computeAttestationTotals(attsSuccess, attsMissed),
    blocks: computeBlockTotals(blocksProposed, blocksMined, checkpointsMissed, blocksMissed),
  };
}

/** Map a single attester row + its performance/history to the API DTO. */
function mapAttester(
  attester: ProviderDetailBundle['attesters'][number],
  bundle: ProviderDetailBundle,
): ProviderAttester {
  const performance = bundle.performance.find(
    p => p.validator_address.toLowerCase() === attester.attesterAddress.toLowerCase(),
  );

  const attestation = computeAttestationTotals(
    Number(performance?.total_attestations_successful || 0),
    Number(performance?.total_attestations_missed || 0),
  );
  const blocks = computeBlockTotals(
    Number(performance?.total_checkpoints_proposed || 0),
    Number(performance?.total_checkpoints_mined || 0),
    Number(performance?.total_checkpoints_missed || 0),
    Number(performance?.total_blocks_missed || 0),
  );

  const history = bundle.history
    .filter(h => h.validator_address.toLowerCase() === attester.attesterAddress.toLowerCase())
    .sort((a, b) => Number(a.epoch_number) - Number(b.epoch_number))
    .map(h => ({ ...h, epoch_number: h.epoch_number.toString() }));

  // Queued attesters haven't actually staked yet — use the protocol deposit amount as their balance.
  const balance = attester.is_in_queue
    ? bundle.depositAmount.toString()
    : attester.stake_balance?.toString() || null;

  return {
    address: attester.attesterAddress,
    name: attester.name || attester.validator_hex_index || getValidatorHexIndex(attester.attesterAddress),
    status: attester.is_in_queue
      ? VALIDATOR_STATUS.QUEUE
      : (attester.migration_status || attester.status || 'unknown'),
    balance,
    xHandle: attester.x_handle,
    xImageUrl: attester.x_image_url,
    discordUsername: attester.discordUsername,
    discordAvatar: attester.discordAvatar,
    attestationsSuccessful: attestation.successful,
    attestationsMissed: attestation.missed,
    attestationRate: attestation.ratePct,
    checkpointsProposed: blocks.proposed,
    checkpointsMined: blocks.mined,
    checkpointsMissed: blocks.checkpointsMissed,
    blocksMissed: blocks.blocksMissed,
    blockSuccessRate: blocks.successRatePct,
    performanceHistory: history,
    isInQueue: attester.is_in_queue,
  };
}

/** Compose the full ProviderDetail DTO from the loader bundle. */
export function buildProviderDetail(bundle: ProviderDetailBundle): ProviderDetail {
  const totals = aggregateProviderTotals(bundle);
  const totalStakedWei = bundle.attesters.reduce(
    (sum, a) => sum + (a.stake_balance ? stringToBigInt(a.stake_balance.toString()) : stringToBigInt(0)),
    stringToBigInt(0),
  );

  return {
    id: bundle.provider.id,
    identifier: bundle.provider.providerIdentifier,
    admin: bundle.config.providerAdmin,
    takeRate: bundle.config.providerTakeRate,
    rewardsRecipient: bundle.config.providerRewardsRecipient,
    createdAt: new Date(Number(bundle.provider.timestamp) * 1000),
    blockNumber: bundle.provider.blockNumber.toString(),
    txHash: bundle.provider.txHash,
    totalAttesters: bundle.attesters.length,
    activeAttesters: bundle.attesters.filter(a => a.status === VALIDATOR_STATUS.ACTIVE).length,
    totalStaked: Number(totalStakedWei).toString(),
    attestationRate: totals.attestation.ratePct,
    attestationsSuccessful: totals.attestation.successful,
    attestationsMissed: totals.attestation.missed,
    blockSuccessRate: totals.blocks.successRatePct,
    checkpointsSuccessful: totals.blocks.proposed + totals.blocks.mined,
    checkpointsProposed: totals.blocks.proposed,
    checkpointsMined: totals.blocks.mined,
    checkpointsMissed: totals.blocks.checkpointsMissed,
    blocksMissed: totals.blocks.blocksMissed,
    attesters: bundle.attesters.map(a => mapAttester(a, bundle)),
    metadata: {
      name: bundle.provider.metadataName,
      description: bundle.provider.metadataDescription,
      website: bundle.provider.metadataWebsite,
      logoUrl: bundle.provider.metadataLogoUrl,
      email: bundle.provider.metadataEmail,
      discord: bundle.provider.metadataDiscord,
    },
    rollupBreakdown: bundle.rollupBreakdown.map(r => ({
      rollupAddress: r.rollup_address,
      remainingCount: Number(r.remaining_count),
    })),
  };
}
