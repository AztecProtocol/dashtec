import { IRollupConfigService } from '../interfaces/IRollupConfigService';
import { createLogger, createRpcClient, createCache, Cache } from '@dashtec/shared-utils';
import { RollupABI } from '@dashtec/shared-types/abis';
import { config } from '../config/config';

const logger = createLogger('RollupConfigService');

/**
 * Rollup Config Service
 * Provides rollup configuration with caching
 */
export class RollupConfigService implements IRollupConfigService {
  private static instance: RollupConfigService;
  private readonly cacheKey = 'slots_per_epoch';
  private readonly cacheDurationMs = 300 * 1000; // 5 minutes
  private readonly defaultSlotsPerEpoch: bigint = 32n;
  private publicClient: ReturnType<typeof createRpcClient>;

  private constructor() {
    this.publicClient = createRpcClient({
      urls: config.RPC_URLS,
      redisUrl: config.REDIS_URL,
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RollupConfigService {
    if (!RollupConfigService.instance) {
      RollupConfigService.instance = new RollupConfigService();
    }
    return RollupConfigService.instance;
  }

  /**
   * Get slots per epoch from the rollup contract
   * Uses caching to avoid repeated RPC calls
   */
  async getSlotsPerEpoch(): Promise<bigint> {
    try {
      const result = await this.publicClient.readContractWithCache({
        address: config.ROLLUP_CONTRACT_ADDRESS,
        abi: RollupABI,
        functionName: 'getEpochDuration',
      }, {
        cacheKey: this.cacheKey,
        ttl: this.cacheDurationMs,
      });

      const slotsPerEpoch = BigInt(result as string | number | bigint);
      logger.debug(`Retrieved SLOTS_PER_EPOCH from getEpochDuration: ${slotsPerEpoch}`);
      return slotsPerEpoch;
    } catch (error) {
      logger.error('Error fetching SLOTS_PER_EPOCH from getEpochDuration, using fallback value of 32', {
        error: error instanceof Error ? error : new Error(String(error))
      });
      return this.defaultSlotsPerEpoch;
    }
  }

  /**
   * Get genesis time from the rollup contract
   */
  async getGenesisTime(): Promise<bigint> {
    try {
      const result = await this.publicClient.readContractWithCache({
        address: config.ROLLUP_CONTRACT_ADDRESS,
        abi: RollupABI,
        functionName: 'getGenesisTime',
      }, {
        cacheKey: 'genesis_time',
        ttl: this.cacheDurationMs,
      });
      return BigInt(result as string | number | bigint);
    } catch (error) {
      logger.error('Error fetching genesis time', { error });
      return 0n;
    }
  }

  /**
   * Get slot duration from the rollup contract
   */
  async getSlotDuration(): Promise<bigint> {
    try {
      const result = await this.publicClient.readContractWithCache({
        address: config.ROLLUP_CONTRACT_ADDRESS,
        abi: RollupABI,
        functionName: 'getSlotDuration',
      }, {
        cacheKey: 'slot_duration',
        ttl: this.cacheDurationMs,
      });
      return BigInt(result as string | number | bigint);
    } catch (error) {
      logger.error('Error fetching slot duration', { error });
      return 72n;
    }
  }

  /**
   * Compute the current on-chain epoch from contract timing values
   */
  async getCurrentOnChainEpoch(): Promise<bigint> {
    const [genesisTime, slotDuration, slotsPerEpoch] = await Promise.all([
      this.getGenesisTime(),
      this.getSlotDuration(),
      this.getSlotsPerEpoch(),
    ]);
    if (genesisTime === 0n || slotDuration === 0n || slotsPerEpoch === 0n) return 0n;
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (now <= genesisTime) return 0n;
    const currentSlot = (now - genesisTime) / slotDuration;
    return currentSlot / slotsPerEpoch;
  }

  /**
   * Get epoch committee for a specific epoch
   */
  async getEpochCommittee(epoch: bigint): Promise<string[]> {
    try {
      const result = await this.publicClient.readContract({
        address: config.ROLLUP_CONTRACT_ADDRESS,
        abi: RollupABI,
        functionName: 'getEpochCommittee',
        args: [epoch],
      });

      return result as string[];
    } catch (error) {
      logger.error(`Failed to get epoch committee for epoch ${epoch}`, { error });
      throw error;
    }
  }
}
