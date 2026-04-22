import { NextResponse, NextRequest } from 'next/server';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { getGovernanceVotingData, getSlashingVotingData } from '@/db/queries/voting-overview';
import { VotingOverviewResponse } from '@/types/api/voting-overview';
import { formatAddress, getRelativeTime, createLogger, serializeError } from '@dashtec/shared-utils';
import { contracts } from '@/lib/contracts';
import { parseRollupParam } from '@/lib/rollupParam';

const logger = createLogger('api:dashboard:voting-overview');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();

  const { searchParams } = new URL(request.url);
  const rollupAddresses = await parseRollupParam(searchParams);

  try {
    // Fetch all data in parallel
    benchmark.start('db_queries');
    const [governanceData, slashingData] = await Promise.all([
      getGovernanceVotingData(rollupAddresses),
      getSlashingVotingData(rollupAddresses)
    ]);
    benchmark.end('db_queries');

    // Fetch round data from contract
    benchmark.start('contract_calls');
    const roundDataPromise = (async () => {
      try {
        const contractRoundData = await contracts.empireBase.getRoundData(governanceData.latestRound);

        // Fetch payload URI if there's a payload with signals
        let payloadURI: string | undefined;
        if (contractRoundData.payloadWithMostSignals && contractRoundData.payloadWithMostSignals !== '0x0000000000000000000000000000000000000000') {
          try {
            const payload = contracts.createPayload(contractRoundData.payloadWithMostSignals);
            payloadURI = await payload.getURI();
          } catch (error: unknown) {
            logger.error('Failed to fetch payload URI', { error: serializeError(error) });
          }
        }

        return {
          lastSignalSlot: contractRoundData.lastSignalSlot.toString(),
          payloadWithMostSignals: contractRoundData.payloadWithMostSignals,
          executed: contractRoundData.executed,
          payloadURI
        };
      } catch (error: unknown) {
        logger.error('Failed to fetch round data from contract', { error: serializeError(error) });
        return undefined;
      }
    })();

    // Wait for contract round data
    const roundData = await roundDataPromise;
    benchmark.end('contract_calls');

    // Transform governance votecasts
    benchmark.start('transformations');
    const governanceVotecasts = governanceData.recentVotes.map(vote => ({
      round: vote.round_number,
      signalerAddress: vote.signaler_address,
      timestamp: vote.vote_date ? getRelativeTime(vote.vote_date) : 'Unknown',
      support: true,
      transactionHash: vote.transaction_hash,
      payloadAddress: vote.payload_address
    }));

    // Transform governance payloads
    const governancePayloads = [
      // Submitted payloads
      ...governanceData.submittedPayloads.map(payload => ({
        round: payload.round_number,
        proposer: formatAddress(
          payload.submitter_address ||
          governanceData.creatorMap.get(payload.payload_address) ||
          payload.payload_address
        ),
        status: 'Submitted' as const,
        timestamp: payload.timestamp ? getRelativeTime(payload.timestamp) : 'Unknown',
        payloadAddress: payload.payload_address,
        transactionHash: payload.transaction_hash
      })),
      // Submittable payloads
      ...governanceData.submittablePayloads.map(payload => ({
        round: payload.round_number,
        proposer: formatAddress(
          governanceData.creatorMap.get(payload.payload_address) ||
          payload.payload_address
        ),
        status: 'Submittable' as const,
        timestamp: payload.timestamp ? getRelativeTime(payload.timestamp) : 'Pending',
        payloadAddress: payload.payload_address
      }))
    ].sort((a, b) => b.round - a.round).slice(0, 3);

    // Transform slashing votecasts
    const slashingVotecasts = slashingData.recentVotes.map(vote => ({
      round: vote.round_number,
      voterAddress: vote.proposer_address,
      timestamp: vote.vote_date ? getRelativeTime(vote.vote_date) : 'Unknown',
      support: true, // All votes in the table are supporting votes
      transactionHash: vote.transaction_hash,
      slotNumber: Number(vote.slot_number),
      epochNumber: Number(vote.epoch_number),
      target: slashingData.roundTargetMap.get(vote.round_number)
    }));

    // Transform slashed validators
    const slashedValidators = slashingData.recentSlashed.map(slashed => ({
      sequencer: slashed.validator_address,
      round: slashed.round_number,
      timestamp: slashed.executed_date ? getRelativeTime(slashed.executed_date) : 'Unknown',
      slashAmount: slashed.slash_amount,
      transactionHash: slashed.deployment_tx_hash || undefined
    }));
    benchmark.end('transformations');

    const { total, details } = benchmark.getResults();

    const response: VotingOverviewResponse = {
      data: {
        governance: {
          latestRound: governanceData.latestRound,
          roundData,
          recentVotecasts: governanceVotecasts,
          recentPayloads: governancePayloads
        },
        slashing: {
          latestRound: slashingData.latestRound,
          latestExecutedRound: slashingData.latestExecutedRound,
          recentVotecasts: slashingVotecasts,
          recentSlashed: slashedValidators
        }
      },
      benchmark: total,
      benchmarkDetails: details,
      status: 'ok'
    };

    return NextResponse.json(response);

  } catch (error) {
    logError(error as Error, 'VOTING_OVERVIEW_FETCH_ERROR', {
      source: 'dashboard/voting-overview/route.ts:GET',
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { error: 'Failed to fetch voting overview data. Please try again later.' },
      { status: 500 }
    );
  }
}
