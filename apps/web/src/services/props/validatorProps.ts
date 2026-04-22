import prisma from '@/lib/prisma';
import { SlashingData } from '@/components/features/validator-detail/SlashingDetailsCard';
import { logError } from '../error/errorLogger';

export async function getValidatorSlashingData(validatorId: string): Promise<SlashingData> {
  try {
    const lowerIdentifier = validatorId.toLowerCase();
    const isAddress = lowerIdentifier.startsWith('0x') && lowerIdentifier.length === 42;

    // Find the validator using Prisma ORM
    const validator = isAddress 
      ? await prisma.validator.findFirst({
          where: { address: lowerIdentifier },
          select: { address: true }
        })
      : await prisma.validator.findFirst({
          where: { validator_hex_index: lowerIdentifier.toUpperCase() },
          select: { address: true }
        });

    if (!validator) {
      return { executed: [] };
    }

    const validatorAddress = validator.address;

    // Fetch all slashing-related data in parallel using Tally schema
    const [executedRaw] = await Promise.all([
      // Executed slashes against this validator
      prisma.$queryRaw<Array<{
        round_number: number;
        executed_date: Date | null;
        transaction_hash: string;
        block_number: string;
        payload_address: string | null;
        slash_amount: number;
        validator_address: string;
      }>>`
        SELECT
          tre.round_number,
          tre.executed_date,
          tre.transaction_hash,
          tre.block_number,
          tre.payload_address,
          tsa.slash_amount,
          tsa.validator_address
        FROM "TallyRoundExecuted" tre
        INNER JOIN "TallySlashAction" tsa ON tre.round_number = tsa.round_number
        WHERE tsa.validator_address = ${validatorAddress}
        ORDER BY tre.executed_date DESC
      `
    ]);


    return {
      executed: executedRaw.map((slash) => ({
        id: `executed_${slash.round_number}_${slash.validator_address}`,
        payload_address: slash.payload_address,
        amount: Number(slash.slash_amount),
        slashed_date: slash.executed_date?.toISOString() || new Date().toISOString(),
        timestamp: null,
        transaction_hash: slash.transaction_hash,
        block_number: slash.block_number,
        round_number: slash.round_number,
        payloadDetails: {
          offenses: 0, // No offense types in Tally schema
          proposedAmount: Number(slash.slash_amount),
          payload: {
            creator_address: '', // Not available in Tally schema
            created_at: slash.executed_date?.toISOString() || new Date().toISOString(),
            timestamp: null,
            transaction_hash: slash.transaction_hash,
            block_number: slash.block_number
          }
        }
      }))
    };
  } catch (error) {
    logError(error as Error, 'Error fetching validator slashing data', {
      validatorId,
      source: 'validatorProps.ts:getValidatorSlashingData',
    });
    return { executed: [] };
  }
}