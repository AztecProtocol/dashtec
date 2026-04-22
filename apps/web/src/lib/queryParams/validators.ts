import { z } from 'zod';
import { parseRollupParam } from '@/lib/rollupParam';
import { getActiveRollupAddress } from '@/services/rollupRegistry';

/** Sortable columns for the validators list. */
export const VALIDATOR_SORT_KEYS = [
  'rank',
  'name',
  'x_handle',
  'status',
  'balance',
  'totalParticipatingEpochs',
  'attestationSuccess',
  'proposalSuccess',
  'performanceScore',
] as const;
export type ValidatorSortKey = (typeof VALIDATOR_SORT_KEYS)[number];

const sortKeySchema = z.enum(VALIDATOR_SORT_KEYS).default('rank');
const sortOrderSchema = z.enum(['asc', 'desc']).default('asc');
const positiveInt = z.coerce.number().int().positive();
const optionalNumberString = z.string().nullable().optional();

const querySchema = z.object({
  page: positiveInt.default(1),
  limit: positiveInt.max(200).default(50),
  sortBy: sortKeySchema,
  sortOrder: sortOrderSchema,
  search: z.string().min(1).optional(),
  status: z.string().optional(),
  show: z.string().optional(),
  provider: z.string().optional(),
  startEpoch: z.coerce.number().int().nonnegative().nullable().default(null),
  endEpoch: z.coerce.number().int().nonnegative().nullable().default(null),
  balanceMin: optionalNumberString,
  balanceMax: optionalNumberString,
  attestationSuccessMin: optionalNumberString,
  attestationSuccessMax: optionalNumberString,
  proposalSuccessMin: optionalNumberString,
  proposalSuccessMax: optionalNumberString,
  performanceScoreMin: optionalNumberString,
  performanceScoreMax: optionalNumberString,
  epochParticipationMin: optionalNumberString,
  epochParticipationMax: optionalNumberString,
});

export interface ValidatorListFilters {
  search?: string;
  status?: string;
  provider?: string;
  balanceMin: string | null;
  balanceMax: string | null;
  attestationSuccessMin: string | null;
  attestationSuccessMax: string | null;
  proposalSuccessMin: string | null;
  proposalSuccessMax: string | null;
  performanceScoreMin: string | null;
  performanceScoreMax: string | null;
  epochParticipationMin: string | null;
  epochParticipationMax: string | null;
}

export interface ValidatorListParams {
  rollupAddresses: string[];
  isActiveRollup: boolean;
  page: number;
  limit: number;
  showAll: boolean;
  sortBy: ValidatorSortKey;
  sortOrder: 'asc' | 'desc';
  filters: ValidatorListFilters;
  startEpoch: number | null;
  endEpoch: number | null;
}

export class ValidatorParamsError extends Error {
  constructor(public readonly issues: string[]) {
    super(issues.join('; '));
    this.name = 'ValidatorParamsError';
  }
}

export async function parseValidatorListParams(
  searchParams: URLSearchParams,
): Promise<ValidatorListParams> {
  // Convert URLSearchParams to a plain object Zod can validate.
  const raw = Object.fromEntries(searchParams.entries());
  const result = querySchema.safeParse(raw);
  if (!result.success) {
    throw new ValidatorParamsError(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`));
  }
  const v = result.data;

  const rollupAddresses = await parseRollupParam(searchParams);
  const activeRollup = await getActiveRollupAddress();
  const isActiveRollup = rollupAddresses.length === 1 && rollupAddresses[0] === activeRollup;

  return {
    rollupAddresses,
    isActiveRollup,
    page: v.page,
    limit: v.limit,
    showAll: v.show === 'all',
    sortBy: v.sortBy,
    sortOrder: v.sortOrder,
    startEpoch: v.startEpoch,
    endEpoch: v.endEpoch,
    filters: {
      search: v.search,
      status: v.status && v.status !== 'All' ? v.status : undefined,
      provider: v.provider,
      balanceMin: v.balanceMin ?? null,
      balanceMax: v.balanceMax ?? null,
      attestationSuccessMin: v.attestationSuccessMin ?? null,
      attestationSuccessMax: v.attestationSuccessMax ?? null,
      proposalSuccessMin: v.proposalSuccessMin ?? null,
      proposalSuccessMax: v.proposalSuccessMax ?? null,
      performanceScoreMin: v.performanceScoreMin ?? null,
      performanceScoreMax: v.performanceScoreMax ?? null,
      epochParticipationMin: v.epochParticipationMin ?? null,
      epochParticipationMax: v.epochParticipationMax ?? null,
    },
  };
}
