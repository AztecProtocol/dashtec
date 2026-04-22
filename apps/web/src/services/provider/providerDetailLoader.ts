import prisma from '@/lib/prisma';
import {
  createProviderByIdentifierQuery,
  createProviderAttestersQuery,
  createProviderPerformanceQuery,
  createProviderRollupBreakdownQuery,
} from '@/db/queries/providers';
import {
  createPerformanceHistoryQuery,
  type PerformanceHistoryRow,
} from '@/db/queries/validatorPerformanceHistory';
import { getProviderConfiguration } from '@/services/rpc/stakingRegistryContract';
import { getNetworkConfigFromCacheOrContract } from '@/services/networkConfig';
import { stringToBigInt } from '@/utils/bigintHelpers';
import { createLogger, serializeError } from '@dashtec/shared-utils';
import type {
  ProviderByIdentifierRow,
  ProviderAttesterRow,
  ProviderPerformanceRow,
} from '@/types/queries/providers';

const logger = createLogger('service:provider-detail');

export interface RollupBreakdownRow {
  rollup_address: string;
  remaining_count: bigint;
}

interface ProviderConfiguration {
  providerAdmin: `0x${string}`;
  providerTakeRate: ProviderByIdentifierRow['providerTakeRate'];
  providerRewardsRecipient: `0x${string}`;
}

export interface ProviderDetailBundle {
  provider: ProviderByIdentifierRow;
  config: ProviderConfiguration;
  attesters: ProviderAttesterRow[];
  rollupBreakdown: RollupBreakdownRow[];
  performance: ProviderPerformanceRow[];
  history: PerformanceHistoryRow[];
  depositAmount: bigint;
}

export interface LoadProviderDetailOptions {
  rollupAddresses: string[];
  isActiveRollup: boolean;
  epochLimit?: number;
}

/**
 * Loads everything needed to render a provider detail page. Returns null if
 * no provider exists for the given identifier.
 *
 * The contract fallback for provider configuration (admin/takeRate/recipient)
 * is intentional: if the contract call fails we use the database snapshot.
 */
export async function loadProviderDetail(
  identifier: string,
  options: LoadProviderDetailOptions,
): Promise<ProviderDetailBundle | null> {
  const networkConfig = await getNetworkConfigFromCacheOrContract();
  const depositAmount = BigInt(networkConfig.depositAmount);

  const providerResult = await prisma.$queryRaw<ProviderByIdentifierRow[]>(
    createProviderByIdentifierQuery(identifier),
  );
  if (providerResult.length === 0) return null;
  const provider = providerResult[0];

  const config = await loadProviderConfig(identifier, provider);

  const [attesters, rollupBreakdown] = await Promise.all([
    prisma.$queryRaw<ProviderAttesterRow[]>(
      createProviderAttestersQuery(identifier, {
        rollupAddresses: options.rollupAddresses,
        isActiveRollup: options.isActiveRollup,
      }),
    ),
    prisma.$queryRaw<RollupBreakdownRow[]>(createProviderRollupBreakdownQuery(identifier)),
  ]);

  const historyLimit = options.epochLimit ? Math.min(options.epochLimit, 50) : 50;
  const attesterAddresses = attesters.map(a => a.attesterAddress);

  const [performance, history] = attesterAddresses.length === 0
    ? [[] as ProviderPerformanceRow[], [] as PerformanceHistoryRow[]]
    : await Promise.all([
        prisma.$queryRaw<ProviderPerformanceRow[]>(
          createProviderPerformanceQuery(attesterAddresses, historyLimit, options.rollupAddresses),
        ),
        prisma.$queryRaw<PerformanceHistoryRow[]>(
          createPerformanceHistoryQuery(attesterAddresses, {
            limit: historyLimit,
            rollupAddresses: options.rollupAddresses,
          }),
        ),
      ]);

  return { provider, config, attesters, rollupBreakdown, performance, history, depositAmount };
}

async function loadProviderConfig(
  identifier: string,
  provider: ProviderByIdentifierRow,
): Promise<ProviderConfiguration> {
  try {
    return await getProviderConfiguration(stringToBigInt(identifier));
  } catch (error: unknown) {
    logger.warn('Failed to fetch provider config from contract; using database values', {
      error: serializeError(error),
    });
    return {
      providerAdmin: provider.providerAdmin as `0x${string}`,
      providerTakeRate: provider.providerTakeRate,
      providerRewardsRecipient: provider.rewardsRecipient as `0x${string}`,
    };
  }
}
