import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import prisma from '@/lib/prisma';
import { parseRollupParam } from '@/lib/rollupParam';
import { contracts } from '@/lib/contracts';
import { CHECKPOINT_MINED, CHECKPOINT_PROPOSED, CHECKPOINT_MISSED, BLOCKS_MISSED } from '@dashtec/shared-types';

export const dynamic = 'force-dynamic';

export interface AttestationInfo {
  slotNumber: number;
  epochNumber: number;
  status: string;
  timestamp: Date;
}

export interface SequencerAttestationsResponse {
  attestations: AttestationInfo[];
  totalAttestations: number;
  checkpointsMined: number;
  checkpointsProposed: number;
  checkpointsMissed: number;
  blocksMissed: number;
  benchmark: string;
  status: 'ok' | 'error';
}

/**
 * GET /api/governance/sequencer-attestations
 *
 * Query Parameters:
 * - sequencerAddress: string (required)
 * - roundNumber: number (required)
 */
export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();

  try {
    const searchParams = request.nextUrl.searchParams;
    const rollupAddresses = await parseRollupParam(searchParams);
    const sequencerAddress = searchParams.get('sequencerAddress');
    const roundNumber = searchParams.get('roundNumber');

    // Validate required parameters
    if (!sequencerAddress) {
      return NextResponse.json(
        { error: 'sequencerAddress is required' },
        { status: 400 }
      );
    }

    if (!roundNumber || isNaN(parseInt(roundNumber))) {
      return NextResponse.json(
        { error: 'Valid roundNumber is required' },
        { status: 400 }
      );
    }

    // Calculate round slot range
    benchmark.start('fetch_round_data');
    const roundSize = await contracts.empireBase.getRoundSize();
    const roundSizeNum = Number(roundSize);
    const roundStartSlot = parseInt(roundNumber) * roundSizeNum;
    const roundEndSlot = roundStartSlot + roundSizeNum - 1;
    benchmark.end('fetch_round_data');

    // Fetch attestations
    benchmark.start('fetch_attestations');
    const attestations = await prisma.validatorAttestation.findMany({
      where: {
        validator_address: sequencerAddress,
        rollup_address: { in: rollupAddresses },
        slot_number: {
          gte: BigInt(roundStartSlot),
          lte: BigInt(roundEndSlot),
        },
        status: {
          in: [CHECKPOINT_MINED, CHECKPOINT_PROPOSED, CHECKPOINT_MISSED, BLOCKS_MISSED],
        },
      },
      select: {
        slot_number: true,
        epoch_number: true,
        status: true,
        timestamp: true,
      },
      orderBy: {
        slot_number: 'asc',
      },
    });
    benchmark.end('fetch_attestations');

    // Calculate counts
    const checkpointsMined = attestations.filter(a => a.status === CHECKPOINT_MINED).length;
    const checkpointsProposed = attestations.filter(a => a.status === CHECKPOINT_PROPOSED).length;
    const checkpointsMissed = attestations.filter(a => a.status === CHECKPOINT_MISSED).length;
    const blocksMissed = attestations.filter(a => a.status === BLOCKS_MISSED).length;

    const response: SequencerAttestationsResponse = {
      attestations: attestations.map(a => ({
        slotNumber: Number(a.slot_number),
        epochNumber: Number(a.epoch_number),
        status: a.status,
        timestamp: a.timestamp,
      })),
      totalAttestations: attestations.length,
      checkpointsMined,
      checkpointsProposed,
      checkpointsMissed,
      blocksMissed,
      benchmark: benchmark.getResults().total,
      status: 'ok',
    };

    return NextResponse.json(response);

  } catch (error) {
    logError(error as Error, 'SEQUENCER_ATTESTATIONS_FETCH_ERROR', {
      source: 'governance/sequencer-attestations/route.ts:GET',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to fetch sequencer attestations. Please try again later.' },
      { status: 500 }
    );
  }
}
