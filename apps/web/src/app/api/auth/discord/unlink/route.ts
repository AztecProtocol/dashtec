import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import prisma from '@/lib/prisma';
import { logError } from '@/services/error/errorLogger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { address, signature, message } = await request.json();

    if (!address || !signature || !message) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    // 1. Verify the signature to ensure the request is from the wallet owner
    const isValidSignature = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValidSignature) {
      await logError('Invalid signature for Discord unlink', 'DISCORD_UNLINK_ERROR', { address });
      return NextResponse.json({ error: 'Invalid signature. Could not authenticate request.' }, { status: 401 });
    }

    // 2. Find the corresponding validator and update it
    const validator = await prisma.validator.findUnique({
      where: { address: address.toLowerCase() },
    });

    if (!validator) {
      return NextResponse.json({ error: 'Sequencer not found for the provided address.' }, { status: 404 });
    }

    // 3. Set Discord fields to null
    await prisma.validator.update({
      where: { address: address.toLowerCase() },
      data: {
        discordId: null,
        discordUsername: null,
        discordAvatar: null,
      },
    });

    return NextResponse.json({ success: true, message: 'Discord account unlinked successfully.' });

  } catch (error) {
    logError(error as Error, 'DISCORD_UNLINK_ERROR', {
      source: 'auth/discord/unlink'
    });
    return NextResponse.json({ error: 'Failed to unlink Discord account. Please try again later.' }, { status: 500 });
  }
}