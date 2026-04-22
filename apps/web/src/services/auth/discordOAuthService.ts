/**
 * Discord OAuth Service
 * Handles all Discord OAuth related operations.
 */

import { logError } from '@/services/error/errorLogger';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = `${process.env.APP_URL}/api/auth/discord/callback`;

export interface DiscordTokenResult {
  access_token: string;
}

export interface DiscordUserProfile {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
}

class DiscordOAuthService {
  /**
   * Build the Discord authorization URL
   */
  buildAuthorizationUrl(state: string): string {
    const authUrl = new URL('https://discord.com/api/oauth2/authorize');
    authUrl.searchParams.set('client_id', DISCORD_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', DISCORD_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'identify'); // 'identify' scope is sufficient to get user info
    authUrl.searchParams.set('state', state);
    return authUrl.toString();
  }

  /**
   * Exchange authorization code for an access token
   */
  async exchangeCodeForToken(code: string): Promise<DiscordTokenResult> {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID!,
        client_secret: DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      await logError(`Failed to get access token from Discord: ${errorText}`, 'DISCORD_OAUTH_ERROR');
      throw new Error('Failed to get access token from Discord.');
    }
    return tokenResponse.json();
  }

  /**
   * Fetch user profile from Discord API
   */
  async fetchUserProfile(accessToken: string): Promise<DiscordUserProfile> {
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      await logError(`Failed to fetch user profile from Discord: ${errorText}`, 'DISCORD_USER_FETCH_ERROR');
      throw new Error("Failed to fetch user's profile from Discord.");
    }
    return userResponse.json();
  }
}

export const discordOAuthService = new DiscordOAuthService();