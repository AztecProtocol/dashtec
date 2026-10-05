import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getRollupRegistry } from '@/services/rollupRegistry';
import { createBenchmark } from '@/services/benchmark';
import { logError } from '@/services/error/errorLogger';
import {
  fetchMigrationSummary,
  fetchMigrationByProvider,
  fetchRemainingValidators,
} from '@/db/queries/rollupMigration';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().trim().min(1).optional(),
  provider: z.string().min(1).optional(),
});

/**
 * GET /api/rollups/migration — who moved from an old rollup version to the
 * current one, and who is still on it. `from` defaults to the version the
 * current rollup replaced.
 */
export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ') },
      { status: 400 },
    );
  }
  const params = parsed.data;

  try {
    const registry = await getRollupRegistry();
    const deprecated = registry.versions.filter((version) => version.deprecated);
    const current = registry.versions.find((version) => version.address === registry.activeAddress)!;

    if (deprecated.length === 0) {
      return NextResponse.json({ migration: null, deprecated: [], status: 'ok' });
    }

    const from = params.from
      ? deprecated.find((version) => version.address === params.from!.toLowerCase())
      : deprecated[deprecated.length - 1];
    if (!from) {
      return NextResponse.json({ error: `${params.from} is not a previous rollup version` }, { status: 400 });
    }

    // The version that replaced `from`: the next one in registry order.
    const to = registry.versions[registry.versions.indexOf(from) + 1] ?? current;

    benchmark.start('queryExecution');
    const [summary, providers, remaining, upgrade] = await Promise.all([
      fetchMigrationSummary(from.address),
      fetchMigrationByProvider(from.address),
      fetchRemainingValidators(from.address, params),
      prisma.canonicalRollupUpdated.findFirst({
        where: { instance_address: { equals: to.address, mode: 'insensitive' } },
        orderBy: { block_number: 'asc' },
      }),
    ]);
    benchmark.end('queryExecution');

    const { total, details } = benchmark.getResults();

    return NextResponse.json({
      migration: {
        from: { address: from.address, label: from.label },
        to: { address: to.address, label: to.label, isCurrent: to.address === current.address },
        upgradedAt: upgrade
          ? { blockNumber: upgrade.block_number.toString(), timestamp: upgrade.timestamp ? Number(upgrade.timestamp) : null }
          : null,
        summary,
        providers,
        remaining: {
          ...remaining,
          page: params.page,
          limit: params.limit,
          totalPages: Math.ceil(remaining.total / params.limit),
        },
      },
      deprecated: deprecated.map((version) => ({ address: version.address, label: version.label })),
      benchmark: total,
      benchmarks: details,
      status: 'ok',
    });
  } catch (error) {
    logError(error as Error, 'ROLLUP_MIGRATION_FETCH_ERROR', {
      source: 'rollups/migration/route.ts:GET',
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Failed to fetch migration progress. Please try again later.' },
      { status: 500 },
    );
  }
}
