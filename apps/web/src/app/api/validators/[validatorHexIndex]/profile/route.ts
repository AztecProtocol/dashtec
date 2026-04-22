import { NextResponse, NextRequest } from 'next/server';
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
    const { validatorHexIndex: identifier } = await params;
    const { searchParams } = new URL(request.url);
    const rollupAddresses = await parseRollupParam(searchParams);

    if (!identifier) {
      return NextResponse.json({ error: 'Sequencer identifier (address or index) is required.' }, { status: 400 });
    }

    // Lightweight query - only fetch social media fields
    const validator = await prisma.validator.findFirst({
      where: { ...validatorWhereByIdentifier(identifier), rollup_address: { in: rollupAddresses } },
      select: {
        address: true,
        x_handle: true,
        x_image_url: true,
        discordUsername: true,
        discordAvatar: true
      }
    });

    if (!validator) {
      return NextResponse.json({ error: 'Sequencer not found' }, { status: 404 });
    }

    const { total } = benchmark.getResults();
    return NextResponse.json({
      x_handle: validator.x_handle,
      x_image_url: validator.x_image_url,
      discordUsername: validator.discordUsername,
      discordAvatar: validator.discordAvatar,
      benchmark: total,
      status: 'ok'
    });

  } catch (error) {
    // Log the actual error details
    const { validatorHexIndex } = await params;
    logError(error as Error, 'VALIDATOR_PROFILE_FETCH_ERROR', {
      source: 'validators/[validatorHexIndex]/profile/route.ts:GET',
      validatorHexIndex,
      timestamp: new Date().toISOString()
    });

    // Return user-friendly message
    return NextResponse.json({
      error: 'Failed to fetch sequencer profile. Please try again later.'
    }, { status: 500 });
  }
}