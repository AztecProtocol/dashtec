import { useQuery, UseQueryResult } from '@tanstack/react-query';

export interface MigrationBucketTotals {
  count: number;
  stake: string;
}

export interface MigrationProvider {
  providerIdentifier: string | null;
  name: string | null;
  logoUrl: string | null;
  migrated: number;
  remaining: number;
  exiting: number;
  exited: number;
  remainingStake: string;
}

export interface RemainingValidator {
  address: string;
  index: string | null;
  name: string | null;
  xHandle: string | null;
  discordUsername: string | null;
  imageUrl: string | null;
  status: string;
  stake: string;
  provider: { providerIdentifier: string; name: string | null } | null;
}

export interface RollupMigration {
  from: { address: string; label: string };
  to: { address: string; label: string; isCurrent: boolean };
  upgradedAt: { blockNumber: string; timestamp: number | null } | null;
  summary: Record<'migrated' | 'active' | 'exiting' | 'exited', MigrationBucketTotals>;
  providers: MigrationProvider[];
  remaining: {
    items: RemainingValidator[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface RollupMigrationResponse {
  migration: RollupMigration | null;
  deprecated: { address: string; label: string }[];
}

export interface RollupMigrationParams {
  from?: string;
  page: number;
  search?: string;
  provider?: string;
}

/** Migration progress from a previous rollup version to the one that replaced it */
export function useRollupMigration(
  params: RollupMigrationParams,
): UseQueryResult<RollupMigrationResponse, Error> {
  return useQuery<RollupMigrationResponse, Error>({
    queryKey: ['rollup-migration', params],
    queryFn: async () => {
      const search = new URLSearchParams({ page: String(params.page) });
      if (params.from) search.set('from', params.from);
      if (params.search) search.set('search', params.search);
      if (params.provider) search.set('provider', params.provider);

      const res = await fetch(`/api/rollups/migration?${search}`);
      if (!res.ok) throw new Error('Failed to fetch migration progress');
      return res.json();
    },
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}
