import { createLogger, normalizeAddress } from '@dashtec/shared-utils';
import { RollupABI, TallySlashingProposerABI } from '../../abis';
import { config } from '../../config';
import type { IndexingFunctionArgs } from 'ponder:registry';

const logger = createLogger('TallySlashingService');

type TallyResult = { attester: `0x${string}`; amount: bigint };

const calculateTotalSlashAmount = (tallyResults: readonly TallyResult[]): string | null =>
  tallyResults.length > 0
    ? tallyResults.reduce((sum, action) => sum + action.amount, 0n).toString()
    : null;

export async function computeEpochFromSlot(
  client: IndexingFunctionArgs['context']['client'],
  slotNumber: bigint,
  rollupAddress: `0x${string}` = config.ROLLUP_CONTRACT_ADDRESS as `0x${string}`
): Promise<bigint | null> {
  try {
    // Note: Ponder client caches automatically, so we don't need explicit cache wrapper
    const slotsPerEpoch = await client.readContract({
      address: rollupAddress,
      abi: RollupABI,
      functionName: 'getEpochDuration',
    });

    return slotNumber / slotsPerEpoch;
  } catch (error) {
    logger.warn(`Failed to compute epoch for slot ${slotNumber}`, { error });
    return null;
  }
}

async function getSlashTargetCommittees(
  client: IndexingFunctionArgs['context']['client'],
  roundNumber: number,
  proposerAddress: `0x${string}`
): Promise<readonly (readonly `0x${string}`[])[]> {
  try {
    return await client.readContract({
      address: proposerAddress,
      abi: TallySlashingProposerABI,
      functionName: 'getSlashTargetCommittees',
      args: [BigInt(roundNumber)],
    });
  } catch (error) {
    logger.error(`Failed to get committees for round ${roundNumber}`, { error });
    return [];
  }
}

// Tries contract first (only works within ROUNDABOUT_SIZE window), always falls back to DB.
// proposerAddress is the proposer that executed the round; every rollup version has its own.
export async function getTally(
  client: IndexingFunctionArgs['context']['client'],
  roundNumber: number,
  db: IndexingFunctionArgs['context']['db'],
  transactionHash: string,
  proposerAddress: `0x${string}` = config.SLASHING_PROPOSER_CONTRACT_ADDRESS as `0x${string}`
): Promise<{
  committees: readonly (readonly `0x${string}`[])[];
  tallyResults: TallyResult[];
  payloadAddress: string | null;
  totalSlashAmount: string | null;
}> {
  let committees: readonly (readonly `0x${string}`[])[] = [];
  let tallyResults: TallyResult[] = [];

  // Try contract first
  try {
    committees = await getSlashTargetCommittees(client, roundNumber, proposerAddress);
    const contractTally = await client.readContract({
      address: proposerAddress,
      abi: TallySlashingProposerABI,
      functionName: 'getTally',
      args: [BigInt(roundNumber), committees],
    });

    if (contractTally.length > 0) {
      tallyResults = contractTally.map((result) => ({
        attester: normalizeAddress(result.attester) as `0x${string}`,
        amount: result.amount,
      }));
      logger.debug(`Got tally from contract for round ${roundNumber}`);
    }
  } catch (contractError) {
    logger.warn(`Contract tally failed for round ${roundNumber}`, { error: contractError });
  }

  // Always fallback to DB if contract failed or returned empty
  if (tallyResults.length === 0) {
    try {
      const slashedEvents = await db.sql.query.slashSlashed.findMany({
        where: (table, { eq }) => eq(table.transaction_hash, transactionHash as `0x${string}`),
      });

      tallyResults = slashedEvents.map((event) => ({
        attester: normalizeAddress(event.attester_address) as `0x${string}`,
        amount: BigInt(event.amount),
      }));

      if (tallyResults.length > 0) {
        logger.debug(`Got tally from DB for round ${roundNumber}`);
      }
    } catch (error) {
      logger.error('Failed to get tally from DB', { error });
    }
  }

  const totalSlashAmount = calculateTotalSlashAmount(tallyResults);
  const payloadAddress = tallyResults.length > 0 ? await getPayloadAddress(client, roundNumber, tallyResults, proposerAddress) : null;

  return {
    committees,
    tallyResults,
    payloadAddress,
    totalSlashAmount,
  };
}

async function getPayloadAddress(
  client: IndexingFunctionArgs['context']['client'],
  roundNumber: number,
  tallyResults: readonly TallyResult[],
  proposerAddress: `0x${string}`
): Promise<string | null> {
  try {
    const address = (await client.readContract({
      address: proposerAddress,
      abi: TallySlashingProposerABI,
      functionName: 'getPayloadAddress',
      args: [BigInt(roundNumber), tallyResults],
    })) as string;

    return normalizeAddress(address);
  } catch (error) {
    logger.error(`Failed to get payload address for round ${roundNumber}`, { error });
    return null;
  }
}

