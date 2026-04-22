import prisma from '@/lib/prisma'
import { INDEPENDENT_PROVIDER_IDENTIFIER } from '@/utils/constants';
import type { ProviderWithCounts } from './types';

/**
 * Initialize providers from database
 * Returns provider map and independent provider object
 */
export async function initializeProviders(): Promise<{
  providerMap: Map<string, ProviderWithCounts>;
  independentProvider: ProviderWithCounts;
}> {
  // Fetch ALL providers from database
  const allProvidersFromDB = await prisma.$queryRaw<Array<{
    provider_identifier: string;
    name: string | null;
    logo_url: string | null;
  }>>`
    SELECT
      p."providerIdentifier" as provider_identifier,
      pm.name,
      pm."logoUrl" as logo_url
    FROM "Provider" p
    LEFT JOIN "ProviderMetadata" pm ON p."providerIdentifier" = pm."providerIdentifier"
  `;

  const providerMap = new Map<string, ProviderWithCounts>();
  allProvidersFromDB.forEach(provider => {
    providerMap.set(provider.provider_identifier, {
      identifier: provider.provider_identifier,
      name: provider.name || `Provider ${provider.provider_identifier}`,
      logoUrl: provider.logo_url || null,
      totalSequencers: 0,
      selectedAsProposer: 0,
      totalProposerSlots: 0,
      signalingSequencers: 0,
      totalSignals: 0,
      totalPossibleSignals: 0,
      participationRate: 0,
      networkParticipationRate: 0,
      payloadSignals: new Map(),
      sequencerAddresses: [],
    });
  });

  const independentProvider: ProviderWithCounts = {
    identifier: INDEPENDENT_PROVIDER_IDENTIFIER,
    name: 'Independent Sequencers',
    logoUrl: null,
    totalSequencers: 0,
    selectedAsProposer: 0,
    totalProposerSlots: 0,
    signalingSequencers: 0,
    totalSignals: 0,
    totalPossibleSignals: 0,
    participationRate: 0,
    networkParticipationRate: 0,
    payloadSignals: new Map(),
    sequencerAddresses: [],
  };

  return { providerMap, independentProvider };
}
