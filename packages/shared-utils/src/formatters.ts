import { formatEther, formatUnits, parseEther, parseUnits } from 'viem';

/**
 * Format wei to ETH with custom decimals
 */
export const formatWeiToEth = (wei: bigint | string, decimals: number = 4): string => {
  const eth = formatEther(BigInt(wei));
  return parseFloat(eth).toFixed(decimals);
};

/**
 * Format address to short format (0x1234...5678)
 */
export const formatAddress = (address: string, chars: number = 4): string => {
  if (!address) return '';
  if (address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

/**
 * Format block number with commas
 */
export const formatBlockNumber = (blockNumber: bigint | string | number): string => {
  return Number(blockNumber).toLocaleString();
};

/**
 * Format timestamp to readable date
 */
export const formatTimestamp = (timestamp: Date | string | number): string => {
  const date = typeof timestamp === 'string' || typeof timestamp === 'number'
    ? new Date(timestamp)
    : timestamp;

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format large numbers with K, M, B suffixes
 */
export const formatCompactNumber = (num: number): string => {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
};

/**
 * Calculate relative time from timestamp
 */
export const getRelativeTime = (date: Date | string | null): string => {
  if (!date) return 'Unknown';

  const timestamp = typeof date === 'string' ? parseInt(date) * 1000 : date.getTime();
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds} secs ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
};

/**
 * Derive slash reason from amount (simplified logic)
 */
export const getSlashReason = (slashAmount: number): string => {
  if (slashAmount > 1000) return 'Double signing';
  if (slashAmount > 500) return 'Missed attestations';
  return 'Protocol violation';
};
