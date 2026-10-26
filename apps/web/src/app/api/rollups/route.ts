import { NextResponse } from 'next/server';
import { getRollupRegistry } from '@/services/rollupRegistry';
import prisma from '@/lib/prisma';
import { createBenchmark } from '@/services/benchmark';
import { logError } from '@/services/error/errorLogger';
import { isLiveRollup } from '@/db/queries/rollupActivity';

export const dynamic = 'force-dynamic';

/** GET /api/rollups - Returns all rollup versions with enriched metadata */
export async function GET() {
  const benchmark = createBenchmark();

  try {
    const registry = await getRollupRegistry();

    const enriched = await Promise.all(
      registry.versions.map(async (version) => {
        const [validatorCount, epochCount, checkpoint, lastCheckpoint] = await Promise.all([
          prisma.validator.count({
            where: { rollup_address: version.address },
          }),
          prisma.epoch.count({
            where: { rollup_address: version.address },
          }),
          prisma.materializerCheckpoint.aggregate({
            where: { rollup_address: version.address },
            _max: { blockNumber: true },
          }),
          prisma.l2BlockProposed.aggregate({
            where: { rollup_address: version.address },
            _max: { block_number: true },
          }),
        ]);

        return {
          ...version,
          validatorCount,
          epochCount,
          frozenAtBlock: checkpoint._max.blockNumber ?? null,
          lastCheckpointBlock: lastCheckpoint._max.block_number?.toString() ?? null,
        };
      })
    );

    const lastCheckpoints = new Map(
      enriched.map((version) => [version.address, version.lastCheckpointBlock ? BigInt(version.lastCheckpointBlock) : null]),
    );
    const withLiveness = enriched.map((version) => ({
      ...version,
      isLive: isLiveRollup(version.address, lastCheckpoints),
    }));

    return NextResponse.json({
      versions: withLiveness,
      active: registry.activeAddress,
      benchmark: benchmark.getResults(),
      status: 'ok',
    });
  } catch (error) {
    logError(
      error instanceof Error ? error : String(error),
      'ROLLUP_REGISTRY_FETCH_ERROR'
    );
    return NextResponse.json(
      { error: 'Failed to fetch rollup versions', status: 'error' },
      { status: 500 }
    );
  }
}
