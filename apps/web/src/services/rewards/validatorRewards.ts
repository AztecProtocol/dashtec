import { prisma } from '@/lib/prisma';
import { getSequencerRewards } from '../rpc/rollupContract';
import { CHECKPOINT_MINED, CHECKPOINT_PROPOSED } from '@dashtec/shared-types';
import { getRollupRegistry } from '../rollupRegistry';

export interface RewardSource {
  address: string;
  rewards: string;
  source: 'attester' | 'split-contract' | 'coinbase';
  label: string;
  rollupAddress?: string;
  rollupLabel?: string;
}

export interface RollupRewardsGroup {
  rollupAddress: string;
  rollupLabel: string;
  isSelected: boolean;
  sources: RewardSource[];
  totalRewards: string;
}

export interface ValidatorRewardsData {
  rewardSources: RewardSource[];
  totalRewards: string;
  rewardsByRollup: RollupRewardsGroup[];
}

/**
 * Fetch rewards for a specific address on a specific rollup
 */
async function fetchRewardsForAddress(
  address: string,
  rollupAddress: string,
  rollupLabel: string,
  source: RewardSource['source'],
  label: string,
): Promise<{ reward: bigint; rewardSource: RewardSource }> {
  const rewards = await getSequencerRewards(address as `0x${string}`, rollupAddress);
  return {
    reward: rewards,
    rewardSource: {
      address,
      rewards: rewards.toString(),
      source,
      label: rewards > 0n ? `${label} (${rollupLabel})` : label,
      rollupAddress,
      rollupLabel,
    },
  };
}

/**
 * Fetch all reward sources for a validator across all rollup versions
 */
export async function getValidatorRewards(
  validatorAddress: string,
  rollupAddresses?: string[]
): Promise<ValidatorRewardsData> {
  const rewardSources: RewardSource[] = [];
  let totalRewards = 0n;

  try {
    // Get all rollup versions to check rewards across
    const registry = await getRollupRegistry();
    const rollupVersions = registry.versions;
    const checkedKeys = new Set<string>();

    // Collect all reward-bearing addresses (attester, split contracts, coinbase)
    const addressesToCheck: { address: string; source: RewardSource['source']; label: string }[] = [
      { address: validatorAddress, source: 'attester', label: 'Attester Address' },
    ];

    // Find split contract addresses
    const stakedRecords = await prisma.stakedWithProvider.findMany({
      where: { attesterAddress: validatorAddress.toLowerCase() },
      select: { coinbaseSplitContractAddress: true },
      distinct: ['coinbaseSplitContractAddress'],
    });
    for (const record of stakedRecords) {
      if (record.coinbaseSplitContractAddress) {
        addressesToCheck.push({
          address: record.coinbaseSplitContractAddress,
          source: 'split-contract',
          label: 'Split Contract',
        });
      }
    }

    // Find coinbase addresses from block proposals, scoped per rollup
    for (const version of rollupVersions) {
      const blockAttestations = await prisma.validatorAttestation.findMany({
        where: {
          validator_address: validatorAddress.toLowerCase(),
          rollup_address: version.address,
          status: { in: [CHECKPOINT_MINED, CHECKPOINT_PROPOSED] },
        },
        select: { slot_number: true },
      });

      if (blockAttestations.length > 0) {
        const slotNumbers = blockAttestations.map((a) => a.slot_number);
        const l2Blocks = await prisma.l2BlockProposed.findMany({
          where: {
            slot_number: { in: slotNumbers },
            rollup_address: version.address,
          },
          select: { coinbase: true },
          distinct: ['coinbase'],
        });
        for (const block of l2Blocks) {
          if (block.coinbase) {
            addressesToCheck.push({
              address: block.coinbase,
              source: 'coinbase',
              label: 'Coinbase Address',
            });
          }
        }
      }
    }

    // Deduplicate addresses
    const uniqueAddresses = addressesToCheck.filter((item, idx) => {
      const key = item.address.toLowerCase();
      if (checkedKeys.has(key)) return false;
      checkedKeys.add(key);
      return true;
    });

    // Check each address on each rollup version
    for (const item of uniqueAddresses) {
      for (const version of rollupVersions) {
        const { reward, rewardSource } = await fetchRewardsForAddress(
          item.address,
          version.address,
          version.label,
          item.source,
          item.label,
        );
        if (reward > 0n) {
          rewardSources.push(rewardSource);
          totalRewards += reward;
        }
      }
    }

    // If no rewards found anywhere, add a zero entry for the selected rollup
    if (rewardSources.length === 0) {
      rewardSources.push({
        address: validatorAddress,
        rewards: '0',
        source: 'attester',
        label: 'Attester Address',
      });
    }
  } catch (error) {
    console.error('Error fetching validator rewards:', error);
    if (rewardSources.length === 0) {
      rewardSources.push({
        address: validatorAddress,
        rewards: '0',
        source: 'attester',
        label: 'Attester Address',
      });
    }
  }

  // Group rewards by rollup
  const selectedRollup = rollupAddresses?.[0]?.toLowerCase();
  const rollupGroups = new Map<string, { label: string; sources: RewardSource[]; total: bigint }>();

  for (const source of rewardSources) {
    const key = source.rollupAddress?.toLowerCase() ?? 'unknown';
    if (!rollupGroups.has(key)) {
      rollupGroups.set(key, { label: source.rollupLabel ?? key.substring(0, 10), sources: [], total: 0n });
    }
    const group = rollupGroups.get(key)!;
    group.sources.push(source);
    group.total += BigInt(source.rewards);
  }

  const rewardsByRollup: RollupRewardsGroup[] = Array.from(rollupGroups.entries()).map(([addr, group]) => ({
    rollupAddress: addr,
    rollupLabel: group.label,
    isSelected: addr === selectedRollup,
    sources: group.sources,
    totalRewards: group.total.toString(),
  }));

  // Sort: selected rollup first, then by total descending
  rewardsByRollup.sort((a, b) => {
    if (a.isSelected && !b.isSelected) return -1;
    if (!a.isSelected && b.isSelected) return 1;
    return Number(BigInt(b.totalRewards) - BigInt(a.totalRewards));
  });

  return {
    rewardSources,
    totalRewards: totalRewards.toString(),
    rewardsByRollup,
  };
}
