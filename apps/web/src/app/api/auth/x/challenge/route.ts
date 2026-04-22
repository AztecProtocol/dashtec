import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import cryptoRandomString from 'crypto-random-string';
import { logError, logDatabaseError } from '@/services/error/errorLogger';
import { generateWalletVerificationMessage } from '@/services/auth/signatureService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    // Validate input
    if (!address) {
      await logError('Address is required for challenge generation', 'CHALLENGE_VALIDATION_ERROR', {
        requestBody: { address }
      });
      return NextResponse.json({ error: 'Address is required.' }, { status: 400 });
    }

    // Validate address format (basic Ethereum address validation)
    if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      await logError('Invalid address format provided', 'CHALLENGE_VALIDATION_ERROR', {
        address,
        addressType: typeof address
      });
      return NextResponse.json({ error: 'Invalid address format.' }, { status: 400 });
    }

    // Generate a secure, random challenge string
    const challenge = cryptoRandomString({ length: 32, type: 'alphanumeric' });
    const expirationTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

    try {
      // Clean up expired challenges
      await prisma.authChallenge.deleteMany({
        where: { createdAt: { lt: expirationTime } },
      });
    } catch (dbError) {
      await logDatabaseError(dbError instanceof Error ? dbError : new Error(String(dbError)), 'CLEANUP_EXPIRED_CHALLENGES', {
        address,
        expirationTime: expirationTime.toISOString()
      });
      // Continue with challenge generation even if cleanup fails
    }

    try {
      // Store the new challenge, replacing any old one for the same address
      await prisma.authChallenge.upsert({
        where: { address: address.toLowerCase() },
        create: { address: address.toLowerCase(), challenge },
        update: { challenge, createdAt: new Date() },
      });
    } catch (dbError) {
      await logDatabaseError(dbError instanceof Error ? dbError : new Error(String(dbError)), 'UPSERT_CHALLENGE', {
        address,
        challengeLength: challenge.length
      });
      return NextResponse.json({ error: 'Failed to store challenge.' }, { status: 500 });
    }

    const message = generateWalletVerificationMessage(challenge);

    return NextResponse.json({ message });

  } catch (error) {
    // Log the general error
    await logError(error instanceof Error ? error : new Error(String(error)), 'CHALLENGE_GENERAL_ERROR', {
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json({ error: 'Failed to generate challenge.' }, { status: 500 });
  }
}