import type { Address } from 'viem';
import { TallySlashingProposerABI } from '@dashtec/shared-types';
import type { ContractClient } from '../../client';

/**
 * Get slashing quorum size from contract
 */
export const getSlashingQuorumSize = (
  client: ContractClient,
  slashingProposerAddress: Address
) =>
  async (): Promise<bigint> => {
    return await client.readContractWithCache<bigint>(
      {
        address: slashingProposerAddress,
        abi: TallySlashingProposerABI,
        functionName: 'QUORUM',
      },
      {
        cacheKey: `slashing:getQuorumSize:${slashingProposerAddress}`,
        cacheDuration: 86_400_000 // 24 hours
      }
    );
  };
