import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMessage } from 'viem';
import { logError, logDatabaseError } from '@/services/error/errorLogger';
import { generateValidatorRenameMessage } from '@/services/auth/signatureService';
import { validatorWhereByIdentifier } from '@/db/queries/helpers';

export const dynamic = 'force-dynamic';

/**
 * API Route to handle updating a validator's custom name.
 * Requires a cryptographic signature to prove ownership.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ validatorHexIndex: string }> }
) {
  try {
    const { validatorHexIndex: identifier } = await params;
    const { name, signature } = await request.json();

    // Validate input parameters
    if (!identifier) {
      await logError('Validator identifier is missing', 'VALIDATOR_RENAME_VALIDATION_ERROR', {
        requestParams: { identifier }
      });
      return NextResponse.json({ error: 'Sequencer identifier is required.' }, { status: 400 });
    }

    if (typeof name !== 'string' || !signature) {
      await logError('Name and signature are required for validator rename', 'VALIDATOR_RENAME_VALIDATION_ERROR', {
        nameType: typeof name,
        signatureType: typeof signature,
        hasName: !!name,
        hasSignature: !!signature
      });
      return NextResponse.json({ error: 'Name and signature are required.' }, { status: 400 });
    }

    if (name.trim().length === 0 || name.length > 25) {
      await logError('Invalid name length for validator rename', 'VALIDATOR_RENAME_VALIDATION_ERROR', {
        nameLength: name.length,
        nameTrimmedLength: name.trim().length,
        name: name
      });
      return NextResponse.json({ error: 'Name must be between 1 and 25 characters.' }, { status: 400 });
    }

    try {
      // First, find the validator
      const validator = await prisma.validator.findFirst({
        where: validatorWhereByIdentifier(identifier),
      });

      if (!validator) {
        await logError('Sequencer not found for rename operation', 'VALIDATOR_RENAME_NOT_FOUND', {
          identifier,
        });
        return NextResponse.json({ error: 'Sequencer not found.' }, { status: 404 });
      }

      const validatorAddress = validator.address;

      // 2. Define the exact message that was signed on the frontend.
      // This prevents the signature from being reused for other actions.
      const message = generateValidatorRenameMessage(name);

      try {
        // 3. Verify that the signature is valid for the specific address and message.
        const isValid = await verifyMessage({
          address: validatorAddress as `0x${string}`,
          message: message,
          signature: signature as `0x${string}`,
        });

        if (!isValid) {
          await logError('Invalid signature for validator rename', 'VALIDATOR_RENAME_SIGNATURE_ERROR', {
            validatorAddress,
            message,
            signature: signature.substring(0, 10) + '...',
            identifier
          });
          return NextResponse.json({ error: 'Invalid signature. The rename request could not be authenticated.' }, { status: 401 });
        }
      } catch (signatureError) {
        await logError('Signature verification failed', 'VALIDATOR_RENAME_SIGNATURE_VERIFICATION_ERROR', {
          validatorAddress,
          message,
          signature: signature.substring(0, 10) + '...',
          identifier,
          error: signatureError instanceof Error ? signatureError.message : String(signatureError)
        });
        return NextResponse.json({ error: 'Signature verification failed.' }, { status: 401 });
      }

      try {
        // 4. If the signature is valid, update the validator's name in the database.
        const updatedValidator = await prisma.validator.update({
          where: { address: validatorAddress },
          data: { name: name.trim() },
        });

        return NextResponse.json({ success: true, validator: updatedValidator });
      } catch (dbError) {
        await logDatabaseError(dbError instanceof Error ? dbError : new Error(String(dbError)), 'UPDATE_VALIDATOR_NAME', {
          validatorAddress,
          newName: name.trim(),
          identifier
        });
        return NextResponse.json({ error: 'Failed to update sequencer name in database.' }, { status: 500 });
      }

    } catch (dbError) {
      await logDatabaseError(dbError instanceof Error ? dbError : new Error(String(dbError)), 'FIND_VALIDATOR', {
        identifier,
      });
      return NextResponse.json({ error: 'Failed to find sequencer.' }, { status: 500 });
    }

  } catch (error) {
    // Log the general error
    await logError(error instanceof Error ? error : new Error(String(error)), 'VALIDATOR_RENAME_GENERAL_ERROR', {
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json({ error: 'An internal error occurred while renaming the sequencer.' }, { status: 500 });
  }
}