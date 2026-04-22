import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { parseRollupParam } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_LIMIT = 100;

export async function GET(request: Request) {
  const benchmark = createBenchmark();
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || `${DEFAULT_PAGE_LIMIT}`, 10);
    const searchQuery = searchParams.get('q');

    const startEpoch = searchParams.get('startEpoch');
    const endEpoch = searchParams.get('endEpoch');

    const rollupAddresses = await parseRollupParam(searchParams);

    const skip = (page - 1) * limit + (page === 1 && !searchQuery ? 1 : 0);

    const whereClause: any = {
      rollup_address: { in: rollupAddresses },
    };
    if (searchQuery && !isNaN(Number(searchQuery))) {
      whereClause.epoch_number = {
        equals: BigInt(searchQuery),
      };
    }

    if (startEpoch && !isNaN(Number(startEpoch))) {
      whereClause.epoch_number = { ...whereClause.epoch_number, gte: BigInt(startEpoch) };
    }

    if (endEpoch && !isNaN(Number(endEpoch))) {
      whereClause.epoch_number = { ...whereClause.epoch_number, lte: BigInt(endEpoch) };
    }

    const totalEpochs = await prisma.epoch.count({ where: whereClause });
    const totalPages = Math.ceil(totalEpochs / limit);
    const epochs = await prisma.epoch.findMany({
      where: whereClause,
      orderBy: {
        epoch_number: 'desc',
      },
      skip,
      take: limit - (page === 1 && !searchQuery ? 1 : 0),
      include: {
        epochIntegrityStats: true,
      },
    });

    const integrityData = epochs.map(epoch => {
      return {
        epochNumber: Number(epoch.epoch_number),
        integrity: parseFloat(epoch.epochIntegrityStats[0]?.integrity_score?.toString() || '0'),
      };
    });

    const { total } = benchmark.getResults();
    return NextResponse.json({
      epochs: integrityData,
      benchmark: total,
      totalPages,
      totalEpochs,
      status: 'ok'
    });

  } catch (error) {
    // Log the actual error details
    logError(error as Error, 'EPOCHS_INTEGRITY_FETCH_ERROR', {
      source: 'epochs/integrity/route.ts:GET',
      timestamp: new Date().toISOString()
    });

    // Return user-friendly message
    return NextResponse.json({
      error: 'Failed to fetch epoch integrity data. Please try again later.'
    }, { status: 500 });
  }
}