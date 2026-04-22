/**
 * Validation Service
 * 
 * Handles input validation for the X OAuth flow
 */

import { logXOAuthError } from '@/services/error/errorLogger';

export interface OAuthInitiationParams {
  address: string | null;
  signature: string | null;
  message: string | null;
}

export interface OAuthCallbackParams {
  code: string | null;
  state: string | null;
}

export class ValidationService {
  /**
   * Validate OAuth initiation parameters
   */
  async validateInitiationParams(params: OAuthInitiationParams): Promise<{
    isValid: boolean;
    errors: string[];
    validatedParams: {
      address: string;
      signature: string;
      message: string;
    } | null;
  }> {
    const { address, signature, message } = params;
    const errors: string[] = [];

    // Check for missing parameters
    if (!address) errors.push('Missing address parameter');
    if (!signature) errors.push('Missing signature parameter');
    if (!message) errors.push('Missing message parameter');

    // Validate Ethereum address format
    if (address && !this.isValidEthereumAddress(address)) {
      errors.push('Invalid Ethereum address format');
    }

    // Validate signature format
    if (signature && !this.isValidSignature(signature)) {
      errors.push('Invalid signature format');
    }

    // Validate message format
    if (message && !this.isValidMessage(message)) {
      errors.push('Invalid message format');
    }

    if (errors.length > 0) {
      await logXOAuthError('Missing or invalid parameters', 'INITIATION_VALIDATION', {
        hasAddress: !!address,
        hasSignature: !!signature,
        hasMessage: !!message,
        errors
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedParams: errors.length === 0 ? { address: address!, signature: signature!, message: message! } : null
    };
  }

  /**
   * Validate OAuth callback parameters
   */
  async validateCallbackParams(params: OAuthCallbackParams): Promise<{
    isValid: boolean;
    errors: string[];
    validatedParams: {
      code: string;
      state: string;
    } | null;
  }> {
    const { code, state } = params;
    const errors: string[] = [];

    // Check for missing parameters
    if (!code) errors.push('Missing authorization code');
    if (!state) errors.push('Missing state parameter');

    // Validate code format (should be a non-empty string)
    if (code && code.trim().length === 0) {
      errors.push('Authorization code cannot be empty');
    }

    // Validate state format (should be a non-empty string)
    if (state && state.trim().length === 0) {
      errors.push('State parameter cannot be empty');
    }

    if (errors.length > 0) {
      await logXOAuthError('Missing or invalid callback parameters', 'CALLBACK_VALIDATION', {
        hasCode: !!code,
        hasState: !!state,
        errors
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedParams: errors.length === 0 ? { code: code!, state: state! } : null
    };
  }

  /**
   * Validate Ethereum address format
   */
  private isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validate signature format
   */
  private isValidSignature(signature: string): boolean {
    return /^0x[a-fA-F0-9]{130}$/.test(signature);
  }

  /**
   * Validate message format (should contain challenge)
   */
  private isValidMessage(message: string): boolean {
    return message.includes('Challenge: ') && message.length > 20;
  }

  /**
   * Validate state parameter matches expected value
   */
  async validateState(providedState: string, expectedState: string): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    if (!providedState || !expectedState) {
      return {
        isValid: false,
        error: 'Missing state parameter'
      };
    }

    if (providedState !== expectedState) {
      await logXOAuthError('Invalid state parameter', 'STATE_VERIFICATION', {
        providedState,
        expectedState
      });
      return {
        isValid: false,
        error: 'Invalid state parameter'
      };
    }

    return { isValid: true };
  }
}

// Export singleton instance
export const validationService = new ValidationService(); 