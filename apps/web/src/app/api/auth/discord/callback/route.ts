import { NextRequest, NextResponse } from 'next/server';
import { discordOAuthService } from '@/services/auth/discordOAuthService';
import { sessionService } from '@/services/auth/sessionService';
import { validationService } from '@/services/validation/validationService';
import prisma from '@/lib/prisma';
import { getEnv } from '@/config/env';
import { createLogger, serializeError } from '@dashtec/shared-utils';

const logger = createLogger('api:auth:discord:callback');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const siweData = await sessionService.getSiweData();
  const redirectAddress = siweData?.address;

  try {
    if (!code || !state) {
      throw new Error('Invalid callback parameters from Discord.');
    }

    // Reuse the state validation from the X OAuth flow
    const stateValidation = await validationService.validateState(state, (await sessionService.getPkceData())?.state || '');
    if (!stateValidation.isValid) {
      throw new Error(stateValidation.error);
    }

    if (!siweData) {
      throw new Error('Session expired. Please try connecting your wallet again.');
    }

    const tokenResult = await discordOAuthService.exchangeCodeForToken(code);
    const userProfile = await discordOAuthService.fetchUserProfile(tokenResult.access_token);

    // Update the validator record in the database
    await prisma.validator.update({
      where: { address: siweData.address.toLowerCase() },
      data: {
        discordId: userProfile.id,
        discordUsername: userProfile.username,
        discordAvatar: userProfile.avatar ? `https://cdn.discordapp.com/avatars/${userProfile.id}/${userProfile.avatar}.png` : null,
      },
    });

    const { APP_URL } = getEnv();
    await sessionService.destroySession();
    return NextResponse.redirect(`${APP_URL}/validators/${siweData.address}?discord_linked=true`);

  } catch (error: unknown) {
    logger.error('Discord OAuth callback error', { error: serializeError(error) });
    await sessionService.destroySession();

    const { APP_URL } = getEnv();
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during Discord verification.';

    if (redirectAddress) {
      const redirectUrl = new URL(`${APP_URL}/validators/${redirectAddress}`);
      redirectUrl.searchParams.set('error', 'discord-auth-failed');
      redirectUrl.searchParams.set('error_message', errorMessage);
      return NextResponse.redirect(redirectUrl);
    }

    const fallbackUrl = new URL(`${APP_URL}/validators`);
    fallbackUrl.searchParams.set('error', 'session-expired');
    fallbackUrl.searchParams.set('error_message', 'Your session expired. Please start the verification process again.');
    return NextResponse.redirect(fallbackUrl);
  }
}