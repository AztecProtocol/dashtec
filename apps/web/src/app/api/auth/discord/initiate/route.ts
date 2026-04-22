import { NextRequest, NextResponse } from 'next/server';
import { sessionService } from '@/services/auth/sessionService';
import { discordOAuthService } from '@/services/auth/discordOAuthService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { address, signature, message, state } = await request.json();

  if (!address || !signature || !message || !state) {
    return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
  }

  try {
    // Save wallet and state info to the session
    // We can reuse the saveOAuthData function from the X auth flow
    await sessionService.saveOAuthData(address, signature, message, '', state); // code_verifier is not used for Discord

    const authUrl = discordOAuthService.buildAuthorizationUrl(state);
    return NextResponse.json({ redirectUrl: authUrl });

  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to initiate Discord OAuth flow.' }, { status: 500 });
  }
}