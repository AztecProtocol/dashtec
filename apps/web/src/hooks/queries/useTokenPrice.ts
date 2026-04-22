'use client';

import { useQuery } from '@tanstack/react-query';

interface TokenPriceData {
  currentPrice: number | null;
  priceChange24h: number | null;
  history: Array<{ timestamp: number; price: number }>;
  symbol: string;
}

/** Fetch token price data with history (falls back to dummy data in dev) */
export function useTokenPrice(symbol = 'AZTEC', days = 30) {
  return useQuery<TokenPriceData>({
    queryKey: ['token-price', symbol, days],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/token-price?symbol=${symbol}&days=${days}`);
        if (!res.ok) throw new Error('Failed to fetch token price');
        return await res.json() as TokenPriceData;
      } catch {
        return { currentPrice: null, priceChange24h: null, history: [], symbol };
      }
    },
    staleTime: 60_000,
  });
}

/** Get just the current price (convenience wrapper) */
export function useCurrentTokenPrice(symbol = 'AZTEC') {
  const { data } = useTokenPrice(symbol);
  return data?.currentPrice ?? null;
}
