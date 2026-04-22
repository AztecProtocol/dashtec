import { NextResponse } from 'next/server';
import { getRollupRegistry } from '@/services/rollupRegistry';
import prisma from '@/lib/prisma';
import { createBenchmark } from '@/services/benchmark';
import { logError } from '@/services/error/errorLogger';

export const dynamic = 'force-dynamic';

/** GET /api/rollups - Returns all rollup versions with enriched metadata */
export async function GET() {
  const benchmark = createBenchmark();

  try {
    const registry = await getRollupRegistry();

    const enriched = await Promise.all(
      registry.versions.map(async (version) => {
        const [validatorCount, epochCount, checkpoint] = await Promise.all([
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
        ]);

        return {
          ...version,
          validatorCount,
          epochCount,
          frozenAtBlock: checkpoint._max.blockNumber ?? null,
        };
      })
    );

    return NextResponse.json({
      versions: enriched,
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
