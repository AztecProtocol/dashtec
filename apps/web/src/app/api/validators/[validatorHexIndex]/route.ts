import { NextRequest, NextResponse } from 'next/server';
import { Validator, ValidatorEpochPerformanceData } from '@/types';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { parseRollupParam } from '@/lib/rollupParam';
import { getValidatorRewards } from '@/services/rewards/validatorRewards';
import { fetchValidatorWithPerformance, fetchMigrationStatus, fetchProviderForValidator, checkValidatorInQueue } from '@/services/validator/validatorDetail';
import { fetchProposalHistory, fetchAttestationHistory, fetchGovernanceVotingHistory, fetchTallyVotingHistory } from '@/services/validator/validatorHistory';
import { fetchValidatorJourney } from '@/services/validator/validatorJourney';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ validatorHexIndex: string }> }
) {
  const benchmark = createBenchmark();

  const { validatorHexIndex: identifier } = await params;
  const { searchParams } = new URL(request.url);
  const rollupAddresses = await parseRollupParam(searchParams);
  const startEpoch = searchParams.get('startEpoch');
  const endEpoch = searchParams.get('endEpoch');

  if (!identifier) {
    return NextResponse.json({ error: 'Sequencer identifier (address or index) is required.' }, { status: 400 });
  }

  try {
    const epochFilter: { gte?: number; lte?: number } = {};
    if (startEpoch && !isNaN(parseInt(startEpoch))) epochFilter.gte = parseInt(startEpoch, 10);
    if (endEpoch && !isNaN(parseInt(endEpoch))) epochFilter.lte = parseInt(endEpoch, 10);

    // Core validator data
    benchmark.start('fetchValidator');
    const validatorData = await fetchValidatorWithPerformance(identifier, rollupAddresses, epochFilter);
    benchmark.end('fetchValidator');

    if (!validatorData) {
      return NextResponse.json({ error: 'Sequencer not found.' }, { status: 404 });
    }

    const address = validatorData.address;

    // Parallel fetches for independent data
    benchmark.start('fetchParallel');
    const [migrationStatus, provider, isInQueue, proposalHistory, recentAttestations, votingHistory, tallyVotingHistory, journey, rewardsData] = await Promise.all([
      fetchMigrationStatus(address, rollupAddresses[0]),
      fetchProviderForValidator(address),
      checkValidatorInQueue(address, rollupAddresses),
      fetchProposalHistory(address, rollupAddresses),
      fetchAttestationHistory(address, rollupAddresses),
      fetchGovernanceVotingHistory(address, rollupAddresses),
      fetchTallyVotingHistory(address, rollupAddresses),
      fetchValidatorJourney(address).catch(err => { logError(err as Error, 'FETCH_JOURNEY', { address }); return []; }),
      getValidatorRewards(address, rollupAddresses),
    ]);
    benchmark.end('fetchParallel');

    // Aggregate epoch performance
    const perfTotals = validatorData.epochPerformance.reduce((acc, perf) => {
      acc.attestationsSucceeded += perf.attestations_successful;
      acc.attestationsMissed += perf.attestations_missed;
      acc.checkpointsProposed += perf.checkpoints_proposed;
      acc.checkpointsMined += perf.checkpoints_mined;
      acc.checkpointsMissed += perf.checkpoints_missed;
      acc.blocksMissed += perf.blocks_missed;
      acc.epochs.add(perf.epoch_number);
      return acc;
    }, { attestationsSucceeded: 0, attestationsMissed: 0, checkpointsProposed: 0, checkpointsMined: 0, checkpointsMissed: 0, blocksMissed: 0, epochs: new Set<bigint>() });

    const totalAttestations = perfTotals.attestationsSucceeded + perfTotals.attestationsMissed;
    const attestationSuccessPercentage = totalAttestations > 0
      ? ((perfTotals.attestationsSucceeded / totalAttestations) * 100).toFixed(1) + '%'
      : '0%';

    const epochPerformanceHistory: ValidatorEpochPerformanceData[] = validatorData.epochPerformance.map(perf => ({
      epochNumber: Number(perf.epoch_number),
      attestationsSuccessful: perf.attestations_successful,
      attestationsMissed: perf.attestations_missed,
      checkpointsProposed: perf.checkpoints_proposed,
      checkpointsMined: perf.checkpoints_mined,
      checkpointsMissed: perf.checkpoints_missed,
      blocksMissed: perf.blocks_missed,
    }));

    // Use migration status for rollup-scoped display when not active on this rollup
    const displayStatus = migrationStatus && migrationStatus !== 'active'
      ? migrationStatus
      : validatorData.status;

    const responseValidator: Validator = {
      index: `#${validatorData.validator_hex_index.toUpperCase()}`,
      address,
      status: displayStatus as Validator['status'],
      balance: Number(validatorData.stake_balance) || 0,
      attestationSuccess: attestationSuccessPercentage,
      withdrawalCredentials: validatorData.withdrawer_address || 'N/A',
      recentAttestations,
      proposalHistory,
      votingHistory,
      tallyVotingHistory,
      totalAttestationsSucceeded: perfTotals.attestationsSucceeded,
      totalAttestationsMissed: perfTotals.attestationsMissed,
      totalCheckpointsProposed: perfTotals.checkpointsProposed,
      totalCheckpointsMined: perfTotals.checkpointsMined,
      totalCheckpointsMissed: perfTotals.checkpointsMissed,
      totalBlocksMissed: perfTotals.blocksMissed,
      totalParticipatingEpochs: perfTotals.epochs.size,
      epochPerformanceHistory,
      x_user_id: validatorData.x_user_id || undefined,
      x_handle: validatorData.x_handle || undefined,
      x_image_url: validatorData.x_image_url || undefined,
      discordId: validatorData.discordId || undefined,
      discordUsername: validatorData.discordUsername || undefined,
      discordAvatar: validatorData.discordAvatar || undefined,
      name: validatorData.name || undefined,
      activationDate: validatorData.activation_date ? Number(validatorData.activation_date) : undefined,
      unclaimedRewards: rewardsData.totalRewards,
      isInQueue,
      provider: provider ?? undefined,
      migrationStatus,
      journey,
    };

    const { total, details } = benchmark.getResults();
    return NextResponse.json({
      ...responseValidator,
      rewardSources: rewardsData.rewardSources,
      rewardsByRollup: rewardsData.rewardsByRollup,
      benchmark: total,
      benchmarks: details,
    });

  } catch (error) {
    logError(error as Error, 'validators', { validatorHexIndex: identifier });
    return NextResponse.json({ error: `Failed to fetch sequencer details, please try again later.` }, { status: 500 });
  }
}
