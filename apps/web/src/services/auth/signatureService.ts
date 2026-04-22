/**
 * Signature Message Service
 * 
 * This service centralizes all signature messages used throughout the application
 * to ensure consistency and make them easier to manage and update.
 */

export interface SignatureContext {
  [key: string]: string | number | boolean;
}

/**
 * Generate signature message for wallet verification
 */
export function generateWalletVerificationMessage(challenge: string): string {
  return `Please sign this message to verify your address for Dashtec. This is not a transaction and will not cost any gas.\n\nChallenge: ${challenge}`;
}

/**
 * Generate signature message for validator rename
 */
export function generateValidatorRenameMessage(name: string): string {
  return `Update my sequencer name to: "${name}"`;
}

/**
 * Generate signature message for X account verification
 */
export function generateXVerificationMessage(address: string, xHandle: string): string {
  return `I am linking my wallet address ${address} to my X account @${xHandle} for Dashtec sequencer verification. This is not a transaction and will not cost any gas.`;
}

/**
 * Generate signature message for X account unverification
 */
export function generateXUnverificationMessage(address: string, xHandle: string): string {
  return `I am unlinking my wallet address ${address} from my X account @${xHandle} for Dashtec sequencer verification. This is not a transaction and will not cost any gas.`;
}

/**
 * Generate signature message for custom actions
 * Use this for any new signature requirements that don't fit the above patterns
 */
export function generateCustomMessage(action: string, context: SignatureContext): string {
  const contextString = Object.entries(context)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
  
  return `I am performing the following action for Dashtec: ${action}\n\nContext: ${contextString}\n\nThis is not a transaction and will not cost any gas.`;
}

/**
 * Validate that a signature message follows our expected format
 */
export function validateSignatureMessage(message: string): boolean {
  // Basic validation - ensure message is not empty and has reasonable length
  if (!message || typeof message !== 'string') {
    return false;
  }
  
  if (message.length < 10 || message.length > 1000) {
    return false;
  }
  
  // Check for common patterns that should be present
  const hasAction = /(verify|update|link|unlink|perform)/i.test(message);
  const hasGasNote = /not.*cost.*gas/i.test(message);
  
  return hasAction || hasGasNote;
}

/**
 * Get all available signature message types for reference
 */
export function getSignatureMessageTypes(): string[] {
  return [
    'wallet_verification',
    'validator_rename',
    'x_verification',
    'x_unverification',
    'custom'
  ];
} 