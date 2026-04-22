import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMessage } from 'viem';
import { logWalletVerificationError, logDatabaseError, logXOAuthError } from '@/services/error/errorLogger';
import { generateXUnverificationMessage } from '@/services/auth/signatureService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { address, x_handle, signature } = await request.json();
    const UNLINK_MESSAGE = generateXUnverificationMessage(address, x_handle);

    // 1. Validate incoming data
    if (!address || !x_handle || !signature) {
      await logXOAuthError('Missing required parameters for unverify', 'UNVERIFY_VALIDATION', {
        hasAddress: !!address,
        hasXHandle: !!x_handle,
        hasSignature: !!signature
      });
      return NextResponse.json({ error: 'Address and signature are required.' }, { status: 400 });
    }

    // 2. Verify that the signature is valid for the specific address and message.
    // This is the security check that ensures the request is from the true owner of the wallet.
    try {
      const isValid = await verifyMessage({
        address: address as `0x${string}`,
        message: UNLINK_MESSAGE,
        signature: signature as `0x${string}`,
      });

      if (!isValid) {
        await logWalletVerificationError('Invalid signature for unverify', {
          address,
          message: UNLINK_MESSAGE,
          signature
        });
        return NextResponse.json({ error: 'Invalid signature. Verification failed.' }, { status: 401 });
      }
    } catch (error) {
      await logWalletVerificationError('Signature verification failed for unverify', {
        address,
        message: UNLINK_MESSAGE,
        signature,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }

    // 3. If the signature is valid, find the validator and update it.
    try {
      const validator = await prisma.validator.findUnique({
        where: { address: address.toLowerCase() as `0x${string}` }
      });

      if (!validator) {
        await logXOAuthError('Validator not found for unverify', 'UNVERIFY_VALIDATOR_LOOKUP', {
          address,
          addressLower: address.toLowerCase()
        });
        return NextResponse.json({ error: 'Sequencer not found.' }, { status: 404 });
      }

      // Check if validator has X account linked
      if (!validator.x_handle && !validator.x_user_id) {
        await logXOAuthError('Attempted to unlink X account that is not linked', 'UNVERIFY_NOT_LINKED', {
          address,
          currentXHandle: validator.x_handle,
          currentXUserId: validator.x_user_id
        });
        return NextResponse.json({ error: 'No X account is currently linked to this sequencer.' }, { status: 400 });
      }

      await prisma.validator.update({
        where: { address: address.toLowerCase() },
        data: {
          x_handle: null,
          x_user_id: null,
        },
      });

      return NextResponse.json({ success: true, message: 'X account unlinked successfully.' });

    } catch (error) {
      await logDatabaseError(error instanceof Error ? error : new Error(String(error)), 'UNVERIFY_VALIDATOR_UPDATE', {
        address,
        operation: 'unlink_x_account'
      });
      throw error;
    }

  } catch (error) {
    await logXOAuthError(error instanceof Error ? error : new Error(String(error)), 'UNVERIFY_GENERAL', {
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });
    return NextResponse.json({ error: 'Failed to unlink account.' }, { status: 500 });
  }
}