import { NextRequest, NextResponse } from 'next/server';
import { xOAuthService } from '@/services/auth/xOAuthService';
import { sessionService } from '@/services/auth/sessionService';
import { validationService } from '@/services/validation/validationService';
import { logXOAuthError } from '@/services/error/errorLogger';
import { getEnv } from '@/config/env';
import { createLogger, serializeError } from '@dashtec/shared-utils';

const logger = createLogger('api:auth:x:connect');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // --- Step 2: Handle callback from X ---
  if (searchParams.has('code') || searchParams.has('error')) {
    return await handleOAuthCallback(request);
  }

  // --- Step 1: Initiate OAuth flow ---
  return await handleOAuthInitiation(searchParams);
}

/**
 * Handle OAuth callback from X
 */
async function handleOAuthCallback(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Get SIWE data early to have the address available for redirection on error
  const siweData = await sessionService.getSiweData();
  const redirectAddress = siweData?.address;

  try {
    if (error) {
      throw new Error(error === 'access_denied' ? 'Authorization was denied.' : 'An unknown X error occurred.');
    }

    // Validate callback parameters
    const validation = await validationService.validateCallbackParams({ code, state });
    if (!validation.isValid) {
      throw new Error('Invalid callback parameters: ' + validation.errors.join(', '));
    }

    const { code: validCode, state: validState } = validation.validatedParams!;

    // Verify state parameter
    const stateValidation = await validationService.validateState(validState, (await sessionService.getPkceData())?.state || '');
    if (!stateValidation.isValid) {
      throw new Error(stateValidation.error);
    }

    // The session must contain the SIWE data to proceed
    if (!siweData) {
      await logXOAuthError('Missing SIWE data in session', 'CALLBACK_SESSION', {});
      throw new Error('Session expired. Please try again.');
    }

    // Get code verifier from session
    const codeVerifier = await sessionService.getCodeVerifier();
    if (!codeVerifier) {
      await logXOAuthError('Missing code verifier in session', 'CALLBACK_SESSION', {});
      throw new Error('Session expired. Please try again.');
    }

    // Complete the verification process
    const result = await xOAuthService.completeVerification(
      validCode,
      codeVerifier,
      siweData
    );

    const { APP_URL } = getEnv();
    // Clean up session on success
    await sessionService.destroySession();

    // Redirect to success page
    return NextResponse.redirect(
      `${APP_URL}/validators/${siweData.address}?verified=true`
    );

  } catch (error: unknown) {
    logger.error('X OAuth callback error', { error: serializeError(error) });

    const errorInstance = error instanceof Error ? error : new Error(String(error));
    const errorMessage = errorInstance.message || 'An unknown error occurred during verification.';

    // Log the error with context, including the address if available
    await logXOAuthError(errorInstance, 'CALLBACK_GENERAL', {
      hasCode: !!code,
      hasState: !!state,
      errorType: errorInstance.constructor.name,
      address: redirectAddress
    });

    const { APP_URL } = getEnv();
    // Always destroy the session after an attempt, successful or not
    await sessionService.destroySession();

    // Redirect to the validator details page with an error
    if (redirectAddress) {
      const redirectUrl = new URL(`${APP_URL}/validators/${redirectAddress}`);
      redirectUrl.searchParams.set('error', 'x-auth-failed');
      redirectUrl.searchParams.set('error_message', errorMessage);
      return NextResponse.redirect(redirectUrl);
    }

    // If the session was lost and we don't have an address, redirect to a generic page
    const fallbackRedirectUrl = new URL(`${APP_URL}/validators`);
    fallbackRedirectUrl.searchParams.set('error', 'x-auth-session-expired');
    fallbackRedirectUrl.searchParams.set('error_message', 'Your session expired. Please start the verification process again.');
    return NextResponse.redirect(fallbackRedirectUrl);
  }
}

/**
 * Handle OAuth initiation
 */
async function handleOAuthInitiation(searchParams: URLSearchParams): Promise<NextResponse> {
  const address = searchParams.get('address');
  const signature = searchParams.get('signature');
  const message = searchParams.get('message');

  // Validate initiation parameters
  const validation = await validationService.validateInitiationParams({ address, signature, message });
  if (!validation.isValid) {
    return NextResponse.json({
      error: 'Invalid parameters: ' + validation.errors.join(', ')
    }, { status: 400 });
  }

  const { address: validAddress, signature: validSignature, message: validMessage } = validation.validatedParams!;

  try {
    // Create PKCE challenge and state
    const { verifier, challenge } = xOAuthService.createPkceChallenge();
    const state = xOAuthService.generateState();

    // Save OAuth data to session
    await sessionService.saveOAuthData(validAddress, validSignature, validMessage, verifier, state);

    // Build authorization URL and redirect
    const authUrl = xOAuthService.buildAuthorizationUrl(state, challenge);
    return NextResponse.redirect(authUrl);

  } catch (error) {
    await logXOAuthError(error instanceof Error ? error : new Error(String(error)), 'INITIATION_SETUP', {
      address: validAddress
    });
    return NextResponse.json({ error: 'Failed to initiate OAuth flow.' }, { status: 500 });
  }
}