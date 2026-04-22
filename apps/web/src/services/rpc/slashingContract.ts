import { contracts } from '@/lib/contracts';
import { createLogger } from '@dashtec/shared-utils';

const logger = createLogger('SlashingContract');
const DEFAULT_QUORUM_SIZE = 101;

/**
 * Get slashing quorum size from contract
 */
export async function getSlashingQuorumSize(): Promise<number> {
  try {
    const result = await contracts.slashing.getSlashingQuorumSize();
    return Number(result);
  } catch (error) {
    logger.error('Error fetching slashing quorum size', { error });
    return DEFAULT_QUORUM_SIZE;
  }
}
