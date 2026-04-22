import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();

  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'AZTEC';
    const days = Math.min(Number(searchParams.get('days')) || 30, 365);

    const cutoff = BigInt(Math.floor(Date.now() / 1000) - days * 24 * 60 * 60);

    benchmark.start('fetchPrices');
    const prices = await prisma.tokenPrice.findMany({
      where: {
        symbol,
        timestamp: { gte: cutoff },
      },
      orderBy: { timestamp: 'asc' },
      select: { price_usd: true, timestamp: true },
    });
    benchmark.end('fetchPrices');

    const history = prices.map(p => ({
      timestamp: Number(p.timestamp),
      price: p.price_usd,
    }));

    // Current price = latest entry
    const currentPrice = history.length > 0 ? history[history.length - 1].price : null;

    // 24h change — compare current price against the previous daily candle
    let priceChange24h: number | null = null;
    if (history.length >= 2 && currentPrice != null) {
      // Filter to daily candles only (midnight timestamps, divisible by 86400)
      const dailyCandles = history.filter(e => e.timestamp % 86400 === 0);
      // Get the second-to-last daily candle (yesterday's close)
      const prevDayCandle = dailyCandles.length >= 2
        ? dailyCandles[dailyCandles.length - 2]
        : dailyCandles[0];
      if (prevDayCandle && prevDayCandle.price > 0) {
        priceChange24h = ((currentPrice - prevDayCandle.price) / prevDayCandle.price) * 100;
      }
    }

    const { total } = benchmark.getResults();

    return NextResponse.json({
      currentPrice,
      priceChange24h: priceChange24h !== null ? Number(priceChange24h.toFixed(2)) : null,
      history,
      symbol,
      benchmark: total,
      status: 'ok',
    });
  } catch (error) {
    logError(error as Error, 'TOKEN_PRICE_FETCH_ERROR', {
      source: 'token-price/route.ts:GET',
    });
    return NextResponse.json(
      { error: 'Failed to fetch token price' },
      { status: 500 }
    );
  }
}
