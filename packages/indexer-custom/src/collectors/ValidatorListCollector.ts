import { BaseCollector, HealthStatus } from '../lib/BaseCollector';
import { config } from '../config/config';
import { ValidatorService } from '../services/ValidatorService';
import { createRpcClient } from '@dashtec/shared-utils';
import { Address } from 'viem';
import { RollupABI, ValidatorContractStatus } from '@dashtec/shared-types';
import { AttesterView } from '../types/attester';

/** Max contracts per multicall — kept small for getAttesterView which returns large structs */
const MULTICALL_BATCH_SIZE = 50;

/** Standard Multicall3 deployment address (same on all EVM chains) */
const MULTICALL3_ADDRESS: Address = '0xcA11bde05977b3631167028862bE2a173976CA11';

/**
 * Validator List Collector
 *
 * Fetches the complete list of validators from the Rollup contract
 * and updates the database with their addresses.
 * Uses multicall to batch RPC reads for efficiency.
 */
class ValidatorListCollector extends BaseCollector {
  private readonly validatorService: ValidatorService;
  private readonly rollupContractAddress: Address;
  private publicClient: ReturnType<typeof createRpcClient>;

  constructor() {
    super('ValidatorListCollector', 1);

    this.validatorService = new ValidatorService();
    this.rollupContractAddress = config.ROLLUP_CONTRACT_ADDRESS;
    this.publicClient = createRpcClient({
      urls: config.RPC_URLS
    });

    this.logger.info('Initialized', {
      pollIntervalMs: config.VALIDATOR_LIST_POLL_INTERVAL_MS,
      batchSize: config.VALIDATOR_LIST_BATCH_SIZE,
      rollupContractAddress: this.rollupContractAddress,
    });
  }

  /** Fetch all validator addresses via multicall batches of getAttesterAtIndex */
  private async fetchAllValidatorAddresses(): Promise<string[]> {
    try {
      const attesterCount = await this.publicClient.readContract({
        address: this.rollupContractAddress,
        abi: RollupABI,
        functionName: 'getActiveAttesterCount',
      }) as bigint;

      const count = Number(attesterCount);
      this.logger.info(`Fetching ${count} attesters from contract via multicall`);

      const addresses: string[] = [];

      for (let i = 0; i < count; i += MULTICALL_BATCH_SIZE) {
        const batchEnd = Math.min(i + MULTICALL_BATCH_SIZE, count);
        const contracts = [];
        for (let j = i; j < batchEnd; j++) {
          contracts.push({
            address: this.rollupContractAddress,
            abi: RollupABI,
            functionName: 'getAttesterAtIndex' as const,
            args: [BigInt(j)],
          });
        }

        const results = await this.publicClient.multicall({ contracts, multicallAddress: MULTICALL3_ADDRESS });

        for (const result of results) {
          if (result.status === 'success') {
            addresses.push(result.result as string);
          }
        }

        this.logger.info(`Fetched ${batchEnd}/${count} attesters`);
      }

      const uniqueAddresses = Array.from(new Set(addresses.map(a => a.toLowerCase())));
      this.logger.info(`Unique validators: ${uniqueAddresses.length} out of ${addresses.length}`);
      return uniqueAddresses;
    } catch (error) {
      this.logger.error('Failed to fetch validator addresses', { error });
      throw error;
    }
  }

  /** Fetch attester views for a batch of addresses via multicall */
  private async fetchAttesterViewsBatch(
    addresses: string[],
    rollupAddress: Address = this.rollupContractAddress
  ): Promise<Map<string, AttesterView | null>> {
    const results = new Map<string, AttesterView | null>();
    const total = addresses.length;

    for (let i = 0; i < total; i += MULTICALL_BATCH_SIZE) {
      const batch = addresses.slice(i, i + MULTICALL_BATCH_SIZE);
      const contracts = batch.map(addr => ({
        address: rollupAddress,
        abi: RollupABI,
        functionName: 'getAttesterView' as const,
        args: [addr as Address],
      }));

      const multicallResults = await this.publicClient.multicall({ contracts, multicallAddress: MULTICALL3_ADDRESS });

      let failures = 0;
      batch.forEach((addr, idx) => {
        const res = multicallResults[idx];
        if (res.status === 'success') {
          results.set(addr.toLowerCase(), res.result as AttesterView);
        } else {
          results.set(addr.toLowerCase(), null);
          failures++;
        }
      });

      this.logger.info(`Fetched attester views ${Math.min(i + MULTICALL_BATCH_SIZE, total)}/${total}${failures > 0 ? ` (${failures} failed)` : ''}`);
    }

    return results;
  }

  /** Fetch attester views with fallback through CanonicalRollupUpdated list */
  private async fetchAttesterViewsWithFallback(addresses: string[]): Promise<Map<string, { view: AttesterView | null; rollupAddress: string }>> {
    const currentRollup = this.rollupContractAddress.toLowerCase();

    // Step 1: Batch fetch all attester views from current rollup
    const primaryViews = await this.fetchAttesterViewsBatch(addresses);
    const result = new Map<string, { view: AttesterView | null; rollupAddress: string }>();

    // Step 2: Identify validators that returned None status and need fallback
    const needsFallback: string[] = [];
    for (const [addr, view] of primaryViews) {
      if (!view || Number(view.status) === ValidatorContractStatus.None) {
        needsFallback.push(addr);
        result.set(addr, { view, rollupAddress: currentRollup });
      } else {
        result.set(addr, { view, rollupAddress: currentRollup });
      }
    }

    if (needsFallback.length === 0) {
      this.logger.info('No validators need fallback');
      return result;
    }

    this.logger.info(`${needsFallback.length} validators need fallback lookup`);

    // Step 3: Get all canonical rollups (newest first, excluding current)
    const fallbackRollups = await this.validatorService.getCanonicalRollupAddresses();
    this.logger.info(`Fallback rollups from CanonicalRollupUpdated: ${fallbackRollups.length}`);

    // Step 4: Try each rollup until all validators are resolved
    let remaining = new Set(needsFallback);

    for (const rollup of fallbackRollups) {
      if (remaining.size === 0) break;

      const addrsToCheck = Array.from(remaining);
      this.logger.info(`Fallback: checking ${addrsToCheck.length} validators on rollup ${rollup.substring(0, 10)}...`);

      const fallbackViews = await this.fetchAttesterViewsBatch(addrsToCheck, rollup as Address);
      for (const [addr, view] of fallbackViews) {
        if (view && Number(view.status) !== ValidatorContractStatus.None) {
          result.set(addr, { view, rollupAddress: rollup.toLowerCase() });
          remaining.delete(addr);
        }
      }

      this.logger.info(`Resolved ${needsFallback.length - remaining.size}/${needsFallback.length} so far`);
    }

    if (remaining.size > 0) {
      this.logger.info(`${remaining.size} validators not found on any rollup`);
    }

    return result;
  }

  async collectData(): Promise<void> {
    if (this.metrics.isRunning) {
      this.logger.info('Collection already in progress. Skipping.');
      return;
    }

    this.startRun();
    const startTime = Date.now();

    try {
      // Step 1: Fetch validators from contract (multicall)
      const contractAddresses = await this.fetchAllValidatorAddresses();
      this.logger.info(`Found ${contractAddresses.length} validators in contract`);

      // Step 2: Fetch validators from database
      const dbAddresses = await this.validatorService.getAllValidatorAddresses();
      this.logger.info(`Found ${dbAddresses.length} validators in database`);

      // Step 3: Merge and deduplicate
      const allAddresses = Array.from(new Set([...contractAddresses, ...dbAddresses]));
      this.logger.info(`Processing ${allAddresses.length} unique validators`);

      // Step 4: Batch fetch all attester views (multicall with fallback)
      this.logger.info('Fetching attester views...');
      const attesterViews = await this.fetchAttesterViewsWithFallback(allAddresses);
      this.logger.info(`Attester views fetched. Starting DB upsert for ${attesterViews.size} validators...`);

      // Step 5: Extract views and per-validator rollup overrides for DB upsert
      const viewsMap = new Map<string, AttesterView | null>();
      const rollupOverrides = new Map<string, string>();
      const currentRollup = this.rollupContractAddress.toLowerCase();
      for (const [addr, { view, rollupAddress }] of attesterViews) {
        viewsMap.set(addr, view);
        if (rollupAddress !== currentRollup) {
          rollupOverrides.set(addr, rollupAddress);
        }
      }

      // Step 6: Batch upsert all validators in DB
      const successCount = await this.validatorService.batchProcessValidatorsFromAttesterViews(viewsMap, rollupOverrides);
      this.logger.info(`Total: ${successCount}/${allAddresses.length} validators upserted`);

      this.recordSuccess(Date.now() - startTime);
    } catch (error) {
      await this.recordError(error instanceof Error ? error.message : String(error));
      this.logger.error('Collection failed', { error });
    } finally {
      this.metrics.isRunning = false;
    }
  }

  async start(): Promise<void> {
    this.logger.info(`Started. Polling every ${config.VALIDATOR_LIST_POLL_INTERVAL_MS / 1000}s`);
    this.collectData().catch(err => this.logger.error('Initial collection failed', { err }));
    setInterval(() => this.collectData().catch(err => this.logger.error('Collection failed', { err })), config.VALIDATOR_LIST_POLL_INTERVAL_MS);
  }

  protected async checkDependencies(): Promise<HealthStatus['dependencies']> {
    const [dbHealth, rpcHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkRpcHealth(config.RPC_URLS[0], 'eth_blockNumber', []),
    ]);
    return { database: dbHealth, rpc: rpcHealth };
  }
}

export { ValidatorListCollector };
