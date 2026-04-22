/**
 * Session Service
 * 
 * Handles session operations for the X OAuth flow
 */

import { getSession } from '@/lib/session';
import { logSessionError } from '@/services/error/errorLogger';

export interface SessionData {
  siwe?: {
    address: string;
    signature: string;
    message: string;
  };
  pkce?: {
    code_verifier: string;
    state: string;
  };
}

export class SessionService {
  /**
   * Get current session
   */
  async getSession() {
    return await getSession();
  }

  /**
   * Save SIWE data to session
   */
  async saveSiweData(address: string, signature: string, message: string): Promise<void> {
    try {
      const session = await this.getSession();
      session.siwe = { address, signature, message };
      await session.save();
    } catch (error) {
      await logSessionError(error instanceof Error ? error : new Error(String(error)), 'SAVE_SIWE', { address });
      throw error;
    }
  }

  /**
   * Save PKCE data to session
   */
  async savePkceData(codeVerifier: string, state: string): Promise<void> {
    try {
      const session = await this.getSession();
      session.pkce = { code_verifier: codeVerifier, state };
      await session.save();
    } catch (error) {
      await logSessionError(error instanceof Error ? error : new Error(String(error)), 'SAVE_PKCE', { state });
      throw error;
    }
  }

  /**
   * Save both SIWE and PKCE data to session
   */
  async saveOAuthData(
    address: string, 
    signature: string, 
    message: string, 
    codeVerifier: string, 
    state: string
  ): Promise<void> {
    try {
      const session = await this.getSession();
      session.siwe = { address, signature, message };
      session.pkce = { code_verifier: codeVerifier, state };
      await session.save();
    } catch (error) {
      await logSessionError(error instanceof Error ? error : new Error(String(error)), 'SAVE_OAUTH_DATA', { address });
      throw error;
    }
  }

  /**
   * Get SIWE data from session
   */
  async getSiweData(): Promise<{ address: string; signature: string; message: string } | null> {
    const session = await this.getSession();
    return session.siwe || null;
  }

  /**
   * Get PKCE data from session
   */
  async getPkceData(): Promise<{ code_verifier: string; state: string } | null> {
    const session = await this.getSession();
    return session.pkce || null;
  }

  /**
   * Verify state parameter
   */
  async verifyState(providedState: string): Promise<boolean> {
    const pkceData = await this.getPkceData();
    return pkceData?.state === providedState;
  }

  /**
   * Get code verifier from session
   */
  async getCodeVerifier(): Promise<string | null> {
    const pkceData = await this.getPkceData();
    return pkceData?.code_verifier || null;
  }

  /**
   * Destroy session
   */
  async destroySession(): Promise<void> {
    try {
      const session = await this.getSession();
      session.destroy();
    } catch (error) {
      await logSessionError(error instanceof Error ? error : new Error(String(error)), 'DESTROY', {});
      // Don't throw here, we still want to continue on success
    }
  }

  /**
   * Clear OAuth data from session
   */
  async clearOAuthData(): Promise<void> {
    try {
      const session = await this.getSession();
      delete session.siwe;
      delete session.pkce;
      await session.save();
    } catch (error) {
      await logSessionError(error instanceof Error ? error : new Error(String(error)), 'CLEAR_OAUTH_DATA', {});
      throw error;
    }
  }
}

// Export singleton instance
export const sessionService = new SessionService(); 