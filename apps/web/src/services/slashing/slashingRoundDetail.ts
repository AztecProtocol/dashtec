import {
  fetchConvictedAttesters,
  fetchRoundExecution,
  fetchValidatorIdentities,
  fetchVotesCast,
  type ValidatorIdentityRow,
} from '@/db/queries/slashingHistory';
import type { ProviderMetadata } from '@/types';

export interface ValidatorInfo {
  name?: string;
  x_handle?: string;
  x_image_url?: string;
  discordUsername?: string;
  discordAvatar?: string;
  provider?: ProviderMetadata | null;
}

export interface SlashingConviction {
  validator_address: string;
  slash_amount: number;
  validator?: ValidatorInfo | null;
}

export interface SlashingVote {
  proposer_address: string;
  voted_at: string | null;
  transaction_hash: string;
  block_number: string;
  validator?: ValidatorInfo | null;
}

export interface SlashingRoundDetail {
  round_number: number;
  slash_count: number;
  executed_date: string | null;
  deployment_tx_hash: string;
  deployment_block: string;
  contract_address: string;
  convicted_attesters: SlashingConviction[];
  votes_cast: SlashingVote[];
}

interface SlashingRoundBundle {
  execution: NonNullable<Awaited<ReturnType<typeof fetchRoundExecution>>>;
  convictions: Awaited<ReturnType<typeof fetchConvictedAttesters>>;
  votes: Awaited<ReturnType<typeof fetchVotesCast>>;
  validatorMap: Record<string, ValidatorInfo>;
}

/**
 * Loads everything needed to render a slashing round detail page.
 * Returns null if no round execution record exists for the given round.
 */
export async function loadSlashingRoundDetail(
  roundNumber: number,
  rollupAddresses: string[],
): Promise<SlashingRoundBundle | null> {
  const execution = await fetchRoundExecution(roundNumber, rollupAddresses);
  if (!execution) return null;

  const [convictions, votes] = await Promise.all([
    fetchConvictedAttesters(roundNumber, rollupAddresses),
    fetchVotesCast(roundNumber, rollupAddresses),
  ]);

  const allAddresses = [
    ...convictions.map(c => c.validator_address),
    ...votes.map(v => v.proposer_address),
  ];
  const validators = await fetchValidatorIdentities([...new Set(allAddresses)]);
  const validatorMap = buildValidatorInfoMap(validators);

  return { execution, convictions, votes, validatorMap };
}

/** Pure transformation: bundle → API DTO. */
export function transformSlashingRoundResponse(bundle: SlashingRoundBundle): SlashingRoundDetail {
  return {
    round_number: bundle.execution.round_number,
    slash_count: bundle.execution.slash_count,
    executed_date: bundle.execution.executed_date?.toISOString() || null,
    deployment_tx_hash: bundle.execution.transaction_hash,
    deployment_block: String(bundle.execution.block_number),
    contract_address: bundle.execution.contract_address,
    convicted_attesters: bundle.convictions.map(c => ({
      validator_address: c.validator_address,
      slash_amount: Number(c.slash_amount),
      validator: bundle.validatorMap[c.validator_address] || null,
    })),
    votes_cast: bundle.votes.map(v => ({
      proposer_address: v.proposer_address,
      voted_at: v.vote_date?.toISOString() || null,
      transaction_hash: v.transaction_hash,
      block_number: String(v.block_number),
      validator: bundle.validatorMap[v.proposer_address] || null,
    })),
  };
}

function buildValidatorInfoMap(rows: ValidatorIdentityRow[]): Record<string, ValidatorInfo> {
  return rows.reduce<Record<string, ValidatorInfo>>((acc, row) => {
    acc[row.address] = {
      name: row.name || undefined,
      x_handle: row.x_handle || undefined,
      x_image_url: row.x_image_url || undefined,
      discordUsername: row.discordUsername || undefined,
      discordAvatar: row.discordAvatar || undefined,
      provider: row.providerIdentifier
        ? {
            providerIdentifier: row.providerIdentifier,
            name: row.provider_name,
            description: row.provider_description,
            website: row.provider_website,
            logoUrl: row.provider_logo_url,
            email: row.provider_email,
            discord: row.provider_discord,
          }
        : null,
    };
    return acc;
  }, {});
}
