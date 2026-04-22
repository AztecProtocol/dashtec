/**
 * X OAuth Service
 * 
 * Handles all X OAuth related operations including token exchange,
 * user profile fetching, and verification logic.
 */

import crypto from 'crypto';
import { verifyMessage } from 'viem';
import prisma from '@/lib/prisma';
import { logXOAuthError, logWalletVerificationError, logDatabaseError } from '@/services/error/errorLogger';

const X_CLIENT_ID = process.env.X_CLIENT_ID;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.APP_URL}/api/auth/x/connect`;

export interface XOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TokenExchangeResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface XUserProfile {
  id: string;
  username: string;
  name?: string;
  image_url?: string;
}

export interface VerificationData {
  address: string;
  signature: string;
  message: string;
}

export class XOAuthService {
  private config: XOAuthConfig;

  constructor(config?: Partial<XOAuthConfig>) {
    this.config = {
      clientId: config?.clientId || X_CLIENT_ID!,
      clientSecret: config?.clientSecret || X_CLIENT_SECRET!,
      redirectUri: config?.redirectUri || REDIRECT_URI,
    };
  }

  /**
   * Create PKCE challenge for OAuth flow
   */
  createPkceChallenge(): { verifier: string; challenge: string } {
    const verifier = crypto.randomBytes(32).toString('hex');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
  }

  /**
   * Generate OAuth state parameter
   */
  generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Build OAuth authorization URL
   */
  buildAuthorizationUrl(state: string, challenge: string): string {
    const authUrl = new URL('https://x.com/i/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', this.config.clientId);
    authUrl.searchParams.set('redirect_uri', this.config.redirectUri);
    authUrl.searchParams.set('scope', 'tweet.read users.read offline.access');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    return authUrl.toString();
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, codeVerifier: string): Promise<TokenExchangeResult> {
    const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
        code_verifier: codeVerifier,
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      await logXOAuthError(`Failed to get access token from X: ${errorText}`, 'TOKEN_EXCHANGE', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        responseText: errorText
      });
      throw new Error('Failed to get access token from X.');
    }

    const tokenData = await tokenResponse.json();
    return {
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
    };
  }

  /**
   * Fetch user profile from X API
   */
  async fetchUserProfile(accessToken: string): Promise<XUserProfile> {
    const userResponse = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      await logXOAuthError(`Failed to fetch user's profile from X: ${errorText}`, 'USER_PROFILE_FETCH', {
        status: userResponse.status,
        statusText: userResponse.statusText,
        responseText: errorText
      });
      throw new Error("Failed to fetch user's profile from X.");
    }

    const { data: xUserData } = await userResponse.json();
    return {
      id: xUserData.id,
      username: xUserData.username,
      name: xUserData.name,
      image_url: xUserData.profile_image_url,
    };
  }

  /**
   * Verify wallet signature
   */
  async verifyWalletSignature(data: VerificationData): Promise<boolean> {
    try {
      const isValidSignature = await verifyMessage({
        address: data.address as `0x${string}`,
        message: data.message,
        signature: data.signature as `0x${string}`
      });

      if (!isValidSignature) {
        await logWalletVerificationError('Invalid signature', {
          address: data.address,
          message: data.message,
          signature: data.signature
        });
        throw new Error("Invalid signature.");
      }

      return true;
    } catch (error) {
      await logWalletVerificationError('Signature verification failed', {
        address: data.address,
        message: data.message,
        signature: data.signature,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Verify challenge from signed message
   */
  async verifyChallenge(message: string, address: string): Promise<any> {
    try {
      const challenge = message.split('Challenge: ')[1];
      const storedChallenge = await prisma.authChallenge.findUnique({ where: { challenge } });

      if (!storedChallenge || storedChallenge.address.toLowerCase() !== address.toLowerCase()) {
        await logXOAuthError('Invalid or expired challenge', 'CHALLENGE_VERIFICATION', {
          address,
          challenge,
          hasStoredChallenge: !!storedChallenge,
          storedChallengeAddress: storedChallenge?.address
        });
        throw new Error("Invalid or expired challenge.");
      }

      return storedChallenge;
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid or expired challenge.") {
        throw error; // Already logged above
      }
      await logDatabaseError(error instanceof Error ? error : new Error(String(error)), 'CHALLENGE_LOOKUP', { address, message });
      throw error;
    }
  }

  /**
   * Update validator with X profile information
   */
  async updateValidatorProfile(address: string, xUserId: string, xUsername: string, xImageUrl: string): Promise<void> {
    try {
      const existingValidator = await prisma.validator.findUnique({
        where: { address: address.toLowerCase() }
      });

      if (!existingValidator) {
        await logXOAuthError('Sequencer not found', 'VALIDATOR_NOT_FOUND', {
          address
        });
        throw new Error('Sequencer not found.');
      } else if (existingValidator.x_user_id || existingValidator.x_handle) {
        await logXOAuthError('Sequencer already has an X account linked', 'VALIDATOR_ALREADY_LINKED', {
          address,
          existingXUserId: existingValidator.x_user_id,
          existingXHandle: existingValidator.x_handle,
          existingXImageUrl: existingValidator.x_image_url
        });
        throw new Error('Sequencer already has an X account linked.');
      }

      await prisma.validator.update({
        where: { address: address.toLowerCase() },
        data: {
          x_user_id: xUserId,
          x_handle: xUsername,
          x_image_url: xImageUrl,
          ...(!existingValidator.name && { name: xUsername }),
        }
      });
    } catch (error) {
      await logDatabaseError(error instanceof Error ? error : new Error(String(error)), 'VALIDATOR_UPDATE', {
        address,
        xUserId,
        xUsername,
        xImageUrl,
        operation: 'update_validator'
      });
      throw error;
    }
  }

  /**
   * Clean up challenge after successful verification
   */
  async cleanupChallenge(challengeId: string): Promise<void> {
    try {
      await prisma.authChallenge.delete({ where: { id: challengeId } });
    } catch (error) {
      await logDatabaseError(error instanceof Error ? error : new Error(String(error)), 'CHALLENGE_CLEANUP', {
        challengeId,
        operation: 'delete_challenge'
      });
      // Don't throw here, cleanup failure shouldn't break the flow
    }
  }

  /**
   * Complete OAuth verification process
   */
  async completeVerification(
    code: string,
    codeVerifier: string,
    verificationData: VerificationData
  ): Promise<{ xUserId: string; xUsername: string; xImageUrl: string }> {
    // Exchange code for token
    const tokenResult = await this.exchangeCodeForToken(code, codeVerifier);

    // Fetch user profile
    const userProfile = await this.fetchUserProfile(tokenResult.accessToken);

    // Verify wallet signature
    await this.verifyWalletSignature(verificationData);

    // Verify challenge
    const storedChallenge = await this.verifyChallenge(verificationData.message, verificationData.address);

    // Update validator profile
    await this.updateValidatorProfile(verificationData.address, userProfile.id, userProfile.username, userProfile.image_url || '');

    // Clean up challenge
    await this.cleanupChallenge(storedChallenge.id);

    return {
      xUserId: userProfile.id,
      xUsername: userProfile.username,
      xImageUrl: userProfile.image_url || ''
    };
  }
}

// Export singleton instance
export const xOAuthService = new XOAuthService(); 