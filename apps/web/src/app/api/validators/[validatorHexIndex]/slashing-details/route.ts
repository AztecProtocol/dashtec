import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { parseRollupParam } from '@/lib/rollupParam';
import { validatorWhereByIdentifier } from '@/db/queries/helpers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ validatorHexIndex: string }> }
) {
  const benchmark = createBenchmark();
  try {
    const { validatorHexIndex } = await params;
    const { searchParams } = new URL(request.url);
    const rollupAddresses = await parseRollupParam(searchParams);

    // First, find the validator
    const validator = await prisma.validator.findFirst({
      where: { ...validatorWhereByIdentifier(validatorHexIndex), rollup_address: { in: rollupAddresses } },
    });

    if (!validator) {
      return NextResponse.json({ error: 'Sequencer not found.' }, { status: 404 });
    }

    const validatorAddress = validator.address;

    // Fetch slashing data using Tally schema
    const [tallyVoteCasts, tallyExecutedRounds] = await Promise.all([
      // 1. Get votes cast by this validator for slashing rounds
      prisma.tallyVoteCast.findMany({
        where: {
          proposer_address: validatorAddress,
          rollup_address: { in: rollupAddresses },
        },
        orderBy: {
          vote_date: 'desc'
        }
      }),

      // 2. Get executed rounds for slashing this validator
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

    // Transform data for frontend using Tally schema structure
    const transformedData = {
      // No pending/accusations in Tally schema - all slashing actions are executed
      accusations: [],

      // Votes cast by this validator for slashing rounds
      proposals: tallyVoteCasts.map(vote => ({
        id: vote.id,
        payload_address: vote.round_number.toString(), // Use round number as identifier
        created_at: vote.created_at.toISOString(),
        timestamp: vote.timestamp,
        transaction_hash: vote.transaction_hash,
        block_number: vote.block_number,
        round_number: vote.round_number,
        vote_date: vote.vote_date?.toISOString() || null,
        slashPayloadData: [] // Not applicable for votes
      })),

      // Executed slashes against this validator
      executed: tallyExecutedRounds.map(round => ({
        id: `executed_${round.round_number}_${round.validator_address}`,
        payload_address: round.payload_address,
        amount: round.slash_amount.toString(),
        slashed_date: round.executed_date?.toISOString() || new Date().toISOString(),
        timestamp: null,
        transaction_hash: round.transaction_hash,
        block_number: round.block_number,
        payloadDetails: {
          offenses: 0, // No offense types in Tally schema
          proposedAmount: round.slash_amount.toString(),
          payload: {
            creator_address: '', // Not available in Tally schema
            created_at: round.executed_date?.toISOString() || new Date().toISOString(),
            timestamp: null,
            transaction_hash: round.transaction_hash,
            block_number: round.block_number
          }
        }
      }))
    };

    const { total } = benchmark.getResults();
    return NextResponse.json({
      ...transformedData,
      benchmark: total,
      status: 'ok'
    });

  } catch (error) {
    logError(error as Error, 'VALIDATOR_SLASHING_DETAILS_FETCH_ERROR', {
      source: 'validators/[validatorHexIndex]/slashing-details/route.ts:GET'
    });
    return NextResponse.json(
      { error: 'Failed to fetch slashing details' },
      { status: 500 }
    );
  }
}