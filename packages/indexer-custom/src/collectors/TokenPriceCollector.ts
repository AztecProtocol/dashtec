import { BaseCollector } from '../lib/BaseCollector';
import { prisma } from '../lib/prisma';

const HYPERLIQUID_API = 'https://api-ui.hyperliquid.xyz/info';
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BACKFILL_DAYS = 90;

/** Fetches AZTEC token price from Hyperliquid and stores in TokenPrice table */
class TokenPriceCollector extends BaseCollector {
  constructor() {
    super('TokenPriceCollector', 7); // port 4007
    this.logger.info('Initialized', { pollIntervalMs: POLL_INTERVAL_MS });
  }

  /** Fetch candle data from Hyperliquid API */
  private async fetchCandles(startTime: number, endTime: number, interval: string = '1d'): Promise<HyperliquidCandle[]> {
    const response = await fetch(HYPERLIQUID_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'candleSnapshot',
        req: { coin: 'AZTEC', interval, startTime, endTime },
      }),
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`);
    }

    return response.json() as Promise<HyperliquidCandle[]>;
  }

  /** Backfill historical daily prices */
  private async backfill(): Promise<number> {
    const latest = await prisma.tokenPrice.findFirst({
      where: { symbol: 'AZTEC' },
      orderBy: { timestamp: 'desc' },
    });

    const now = Date.now();
    const startTime = latest
      ? Number(latest.timestamp) * 1000
      : now - BACKFILL_DAYS * 24 * 60 * 60 * 1000;

    if (now - startTime < 60 * 60 * 1000) return 0; // less than 1h gap, skip

    const candles = await this.fetchCandles(startTime, now, '1d');
    let upserted = 0;

    for (const candle of candles) {
      const timestamp = Math.floor(candle.t / 1000);
      await prisma.tokenPrice.upsert({
        where: { symbol_timestamp: { symbol: 'AZTEC', timestamp: BigInt(timestamp) } },
        create: {
          symbol: 'AZTEC',
          price_usd: parseFloat(candle.c),
          timestamp: BigInt(timestamp),
          source: 'hyperliquid',
        },
        update: {
          price_usd: parseFloat(candle.c),
        },
      });
      upserted++;
    }

    return upserted;
  }

  /** Fetch latest price and upsert */
  private async fetchLatest(): Promise<void> {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const candles = await this.fetchCandles(oneHourAgo, now, '1h');

    if (candles.length === 0) return;

    const latest = candles[candles.length - 1];
    const timestamp = Math.floor(latest.t / 1000);

    await prisma.tokenPrice.upsert({
      where: { symbol_timestamp: { symbol: 'AZTEC', timestamp: BigInt(timestamp) } },
      create: {
        symbol: 'AZTEC',
        price_usd: parseFloat(latest.c),
        timestamp: BigInt(timestamp),
        source: 'hyperliquid',
      },
      update: {
        price_usd: parseFloat(latest.c),
      },
    });
  }

  protected async collectData(): Promise<void> {
    const backfilled = await this.backfill();
    if (backfilled > 0) {
      this.logger.info(`Backfilled ${backfilled} price candles`);
    }

    await this.fetchLatest();
    this.recordSuccess();
  }

  async start(): Promise<void> {
    this.logger.info(`Started. Polling every ${POLL_INTERVAL_MS / 1000}s`);
    this.collectData().catch(err => this.logger.error('Initial collection failed', { err }));
    setInterval(() => this.collectData().catch(err => this.logger.error('Collection failed', { err })), POLL_INTERVAL_MS);
  }

  protected async checkDependencies() {
    const dbHealth = await this.checkDatabaseHealth();
    const apiHealth = await this.checkHttpHealth(HYPERLIQUID_API, 'POST');
    return { database: dbHealth, api: apiHealth };
  }
}

interface HyperliquidCandle {
  t: number;  // timestamp ms
  o: string;  // open
  h: string;  // high
  l: string;  // low
  c: string;  // close
  v: number;  // volume
}

export { TokenPriceCollector };
