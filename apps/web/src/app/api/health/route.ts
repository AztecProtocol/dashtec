import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPublicClient } from '@/lib/viemClient';
import { createLogger, serializeError } from '@dashtec/shared-utils';

const logger = createLogger('api:health');

export const dynamic = 'force-dynamic';

/**
 * Health check endpoint for monitoring services.
 * Verifies connectivity to essential dependencies like the database and blockchain node.
 *
 * @returns A NextResponse object with a status of 200 OK if all checks pass,
 * or 503 Service Unavailable if any check fails.
 */
export async function GET() {
  const checks = {
    database: 'ok',
    blockchain: 'ok',
  };
  let httpStatus: 200 | 503 = 200;

  try {
    // 1. Check database connectivity with a simple, low-cost query.
    await prisma.$queryRaw`SELECT 1`;
  } catch (e: unknown) {
    logger.error('Health check failed: Database connection error.', { error: serializeError(e) });
    checks.database = 'error';
    httpStatus = 503;
  }

  try {
    // 2. Check blockchain node connectivity by fetching the latest block number.
    const client = await getPublicClient();
    if (!client) {
      throw new Error("Viem client could not be initialized. Check RPC configuration.");
    }
    await client.getBlockNumber();
  } catch (e: unknown) {
    logger.error('Health check failed: Blockchain connection error.', { error: serializeError(e) });
    checks.blockchain = 'error';
    httpStatus = 503;
  }

  const overallStatus = httpStatus === 200 ? 'ok' : 'error';

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: httpStatus }
  );
}