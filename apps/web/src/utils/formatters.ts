import { formatUnits } from "viem";
import { stringToBigIntSafe } from "./bigintHelpers";

export const formatTime = (totalSeconds: number): string => {
  if (totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};


export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000); // Convert UNIX timestamp from seconds to milliseconds
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Returns a Tailwind CSS color class based on a performance rate string.
 * Handles 'N/A' values and is configurable for different thresholds and colors.
 * @param rate - The performance rate string (e.g., "95.5%" or "N/A").
 * @param thresholds - The percentage thresholds for high and medium performance.
 * @returns A string of Tailwind CSS classes for the text color.
 */
export const getPerformanceColor = (
  rate: string | null | undefined,
  thresholds = { high: 90, medium: 70 }
): string => {
  if (!rate || rate === 'N/A') {
    return 'text-slate-500 dark:text-slate-400';
  }

  const percentage = parseFloat(rate);

  if (isNaN(percentage)) {
    return 'text-slate-500 dark:text-slate-400';
  }

  if (percentage >= thresholds.high) {
    return 'text-green-600 dark:text-green-400';
  }
  if (percentage >= thresholds.medium) {
    return 'text-amber-500 dark:text-amber-400';
  }
  return 'text-red-600 dark:text-red-400';
};

export const getPerformanceColorWithBg = (
  rate: string | null | undefined,
  thresholds = { high: 90, medium: 70 }
): { textColor: string, bgColor: string } => {
  const defaultColor = { textColor: 'text-slate-500 dark:text-slate-400', bgColor: 'bg-slate-500 dark:bg-slate-400' };

  if (!rate || rate === 'N/A') {
    return defaultColor;
  }

  const percentage = parseFloat(rate);

  if (isNaN(percentage)) {
    return defaultColor;
  }

  if (percentage >= thresholds.high) {
    return { textColor: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-600 dark:bg-green-400' };
  }
  if (percentage >= thresholds.medium) {
    return { textColor: 'text-amber-500 dark:text-amber-400', bgColor: 'bg-amber-500 dark:bg-amber-400' };
  }
  return { textColor: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-600 dark:bg-red-400' };
};

/**
 * Calculates a color on a green-to-red scale based on a percentage.
 * @param integrity - A value between 0 and 100.
 * @returns An HSL color string.
 */
export const getIntegrityColor = (integrity: number): string => {
  // Clamp the integrity value between 0 and 100
  const clampedIntegrity = Math.max(0, Math.min(100, integrity));

  // const hue = (clampedIntegrity / 100) * 120;
  const hue = (Math.pow(clampedIntegrity / 100, 24)) * 120;
  const saturation = 70; 
  const lightness = 45; 

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export const formatBalance = (
  rawBalance: string | number | undefined | null,
  decimals: number,
  symbol: string,
  useLargeNumberFormat: boolean = false
): string => {
  if (rawBalance === null || rawBalance === undefined || rawBalance === 'N/A') {
    return 'N/A';
  }
  try {
    const balanceBigInt = stringToBigIntSafe(rawBalance);
    const value = Number(formatUnits(balanceBigInt, decimals));

    if (useLargeNumberFormat) {
      return formatLargeNumber(value, symbol);
    }

    const formatted = value.toFixed(2);
    // Add commas for thousands separators
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${parts.join('.')} ${symbol}`;
  } catch (error) {
    console.error("Failed to format balance:", { rawBalance, decimals, symbol, error });
    return 'Invalid Balance';
  }
};

export const formatLargeNumber = (value: number, symbol: string): string => {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B ${symbol}`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M ${symbol}`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K ${symbol}`;
  } else {
    return `${value.toFixed(2)} ${symbol}`;
  }
};

/** Format a token balance with USD equivalent */
export const formatBalanceWithUsd = (
  rawBalance: string | number | undefined | null,
  decimals: number,
  symbol: string,
  priceUsd: number | null,
  useLargeNumberFormat: boolean = false
): { formatted: string; usd: string | null } => {
  const formatted = formatBalance(rawBalance, decimals, symbol, useLargeNumberFormat);
  if (!priceUsd || formatted === 'N/A' || formatted === 'Invalid Balance' || rawBalance === null || rawBalance === undefined) {
    return { formatted, usd: null };
  }
  try {
    const balanceBigInt = stringToBigIntSafe(rawBalance);
    const value = Number(formatUnits(balanceBigInt, decimals));
    const usdValue = value * priceUsd;
    const usd = usdValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
    return { formatted, usd };
  } catch {
    return { formatted, usd: null };
  }
};

export { formatAddress } from '@dashtec/shared-utils/formatters';

