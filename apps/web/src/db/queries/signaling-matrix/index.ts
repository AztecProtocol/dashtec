import prisma from '@/lib/prisma';
import { ProposerVoteType } from '@dashtec/shared-types';
import { getRollupBlockRange } from '@/lib/rollupParam';
import {
  calculateNetworkStats,
  buildSignalLookup,
  initializeProviders,
  populateProvidersWithValidators,
  calculateProviderMetrics,
  filterAndSortProviders,
  paginateProviders,
} from './helpers';
import { getValidatorsWithProviders } from './queries';
import type { ProviderWithCounts } from './types';

export * from './types';
export * from './helpers';
export * from './queries';

/**
 * Get paginated providers with signal counts (no lists in response)
 */
export async function getProvidersWithSignalCounts(
  roundNumber: number,
  payloadAddresses: string[],
  proposerSlotCounts: Map<string, number>,
  options: {
    page: number;
    limit: number;
    sortBy: 'name' | 'support' | 'opportunities';
    filterStatus: 'all' | 'signaled' | 'no_signal';
    search?: string;
  },
  rollupAddresses: string[]
): Promise<{
  providers: ProviderWithCounts[];
  totalCount: number;
  totalNetworkSignals: number;
  totalNetworkSequencers: number;
  totalNetworkActiveSignalingSequencers: number;
  totalNetworkActiveProviders: number;
  totalNetworkProposerSlots: number;
}> {
  const networkStats = await calculateNetworkStats(roundNumber, proposerSlotCounts);

  const validators = await getValidatorsWithProviders();
  const blockRange = rollupAddresses?.length ? await getRollupBlockRange(rollupAddresses) : null;
  const blockFilter = blockRange ? {
    block_number: { gte: BigInt(blockRange.startBlock), ...(blockRange.endBlock ? { lt: BigInt(blockRange.endBlock) } : {}) }
  } : {};
  const signals = await prisma.proposerVote.findMany({
    where: {
      vote_type: ProposerVoteType.GOVERNANCE_PROPOSER,
      round_number: roundNumber,
      ...blockFilter,
    },
    select: {
      signaler_address: true,
      payload_address: true,
    },
  });
  const signalLookup = buildSignalLookup(signals);

  const { providerMap, independentProvider } = await initializeProviders();

  let allProviders = populateProvidersWithValidators(validators, providerMap, independentProvider);

  allProviders = calculateProviderMetrics(
    allProviders,
    payloadAddresses,
    proposerSlotCounts,
    signalLookup,
    networkStats.totalNetworkProposerSlots
  );

  const { filteredProviders, independentProvider: independentProviderData } =
    filterAndSortProviders(allProviders, options);

  const { paginatedProviders, totalCount } = paginateProviders(
    filteredProviders,
    independentProviderData,
    options
  );

  const totalNetworkActiveProviders = allProviders.filter(p => p.totalSignals > 0).length;

  return {
    providers: paginatedProviders,
    totalCount,
    totalNetworkSignals: networkStats.totalNetworkSignals,
    totalNetworkSequencers: networkStats.totalNetworkSequencers,
    totalNetworkActiveSignalingSequencers: networkStats.totalNetworkActiveSignalingSequencers,
    totalNetworkActiveProviders,
    totalNetworkProposerSlots: networkStats.totalNetworkProposerSlots,
  };
}
