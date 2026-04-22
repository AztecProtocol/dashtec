import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { getFilteredSequencerSignals } from '@/db/queries/sequencer-signals';
import { parseRollupParam } from '@/lib/rollupParam';
import type { SequencerSignalsResponse } from '@/types/api/sequencer-signals';

export const dynamic = 'force-dynamic';

/**
 * GET /api/governance/sequencer-signals
 *
 * Query Parameters:
 * - sequencerAddress: string (required) - The sequencer address to filter signals
 * - roundNumber: number (required) - The governance round number
 * - payloadAddress: string (optional) - Filter signals for a specific payload
 */
export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();

  try {
    const searchParams = request.nextUrl.searchParams;
    const sequencerAddress = searchParams.get('sequencerAddress');
    const roundNumber = searchParams.get('roundNumber');
    const payloadAddress = searchParams.get('payloadAddress') || undefined;

    if (!sequencerAddress) {
      return NextResponse.json(
        { error: 'sequencerAddress query parameter is required' },
        { status: 400 }
      );
    }

    if (!roundNumber || isNaN(Number(roundNumber))) {
      return NextResponse.json(
        { error: 'roundNumber query parameter is required and must be a valid number' },
        { status: 400 }
      );
    }

    const rollupAddresses = await parseRollupParam(searchParams);

    benchmark.start('fetch_signals');
    const signals = await getFilteredSequencerSignals(sequencerAddress, Number(roundNumber), payloadAddress, rollupAddresses);
    benchmark.end('fetch_signals');

    const response: SequencerSignalsResponse = {
      sequencerAddress,
      payloadAddress,
      signals: signals.map(signal => ({
        payloadAddress: signal.payloadAddress,
        timestamp: signal.timestamp,
        transactionHash: signal.transactionHash,
        roundNumber: signal.roundNumber,
        slotNumber: signal.slotNumber ? Number(signal.slotNumber) : null,
        l2BlockNumber: signal.l2BlockNumber ? Number(signal.l2BlockNumber) : null,
        coinbase: signal.coinbase,
      })),
      totalSignals: signals.length,
      benchmark: benchmark.getResults().total,
      status: 'ok',
    };

    return NextResponse.json(response);

  } catch (error) {
    logError(error as Error, 'SEQUENCER_SIGNALS_FETCH_ERROR', {
      source: 'governance/sequencer-signals/route.ts:GET',
      sequencerAddress: request.nextUrl.searchParams.get('sequencerAddress'),
      roundNumber: request.nextUrl.searchParams.get('roundNumber'),
      payloadAddress: request.nextUrl.searchParams.get('payloadAddress'),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to fetch sequencer signals. Please try again later.' },
      { status: 500 }
    );
  }
}