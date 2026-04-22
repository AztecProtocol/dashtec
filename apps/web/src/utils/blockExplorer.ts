/**
 * Block Explorer Utilities
 * 
 * Centralized utility functions for generating block explorer URLs
 */

const ETHEREUM_EXPLORER_URL = process.env.ETHEREUM_EXPLORER_URL || 'https://etherscan.io';
const AZTEC_SCAN_URL = process.env.AZTEC_SCAN_URL || 'https://aztecscan.xyz';

/**
 * Generate a transaction URL for the configured block explorer
 * @param txHash Transaction hash
 * @returns Full URL to view the transaction
 */
export function getTxUrl(txHash: string): string {
  return `${ETHEREUM_EXPLORER_URL}/tx/${txHash}`;
}

/**
 * Generate an address URL for the configured block explorer
 * @param address Ethereum address
 * @returns Full URL to view the address
 */
export function getAddressUrl(address: string): string {
  return `${ETHEREUM_EXPLORER_URL}/address/${address}`;
}

/**
 * Generate a block URL for the configured block explorer
 * @param blockNumber Block number or hash
 * @returns Full URL to view the block
 */
export function getBlockUrl(blockNumber: string | number): string {
  return `${ETHEREUM_EXPLORER_URL}/block/${blockNumber}`;
}

/**
 * Get the base URL of the configured block explorer
 * @returns Base URL of the block explorer
 */
export function getExplorerBaseUrl(): string {
  return ETHEREUM_EXPLORER_URL;
}

/**
 * Get a user-friendly name for the block explorer
 * @returns Display name for the explorer
 */
export function getExplorerName(): string {
  if (ETHEREUM_EXPLORER_URL.includes('etherscan.io')) {
    return 'Etherscan';
  } else if (ETHEREUM_EXPLORER_URL.includes('sepolia.etherscan.io')) {
    return 'Etherscan (Sepolia)';
  } else if (ETHEREUM_EXPLORER_URL.includes('blockscout')) {
    return 'Blockscout';
  } else {
    return 'Block Explorer';
  }
}

// ===== Aztec Scan (L2) Utilities =====

/**
 * Generate an L2 block URL for Aztec Scan
 * @param l2BlockNumber L2 block number
 * @returns Full URL to view the L2 block on Aztec Scan
 */
export function getAztecBlockUrl(l2BlockNumber: string | number): string {
  return `${AZTEC_SCAN_URL}/blocks/${l2BlockNumber}`;
}

/**
 * Get the base URL of Aztec Scan
 * @returns Base URL of Aztec Scan
 */
export function getAztecScanBaseUrl(): string {
  return AZTEC_SCAN_URL;
}