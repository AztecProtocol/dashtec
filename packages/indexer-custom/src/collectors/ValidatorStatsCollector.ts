import { BaseCollector, HealthStatus } from '../lib/BaseCollector';
import { config } from '../config/config';
import { ValidatorService } from '../services/ValidatorService';
import { EpochService } from '../services/EpochService';
import { RollupConfigService } from '../services/RollupConfigService';
import { ValidatorStatDetail } from '../types/validatorStats';
import { createAztecRpcClient, createAztecMethods, ValidatorsStatsResult } from '@dashtec/aztec-rpc-sdk';

/**
 * Validator Stats Collector
 * Fetches validator statistics from RPC and updates database
 */
class ValidatorStatsCollector extends BaseCollector {
  private readonly validatorService: ValidatorService;
  private readonly epochService: EpochService;
  private readonly rollupConfigService: RollupConfigService;
  private readonly aztec: ReturnType<typeof createAztecMethods>;
  private allProcessedEpochsInCycle: Set<bigint>;

  constructor() {
    super('ValidatorStatsCollector', 0);

    this.validatorService = new ValidatorService();
    this.epochService = new EpochService();
    this.rollupConfigService = RollupConfigService.getInstance();
    this.allProcessedEpochsInCycle = new Set<bigint>();

    // Use aztec-rpc-sdk instead of RpcService
    const client = createAztecRpcClient({
      url: config.VALIDATOR_STATS_RPC_URL,
      timeout: 30000,
    });
    this.aztec = createAztecMethods(client);

    this.logger.info('Initialized', {
      pollIntervalMs: config.VALIDATOR_STATS_POLL_INTERVAL_MS,
      maxPastEpochs: config.VALIDATOR_STATS_MAX_PAST_EPOCHS,
      batchSize: config.VALIDATOR_STATS_BATCH_SIZE,
    });
  }

  /**
   * Process validator stats from RPC response
   */
  private async processValidatorStats(result: ValidatorsStatsResult): Promise<void> {
    if (!result || !result.stats) {
      this.logger.warn('No stats data found in RPC response');
      return;
    }

    const { stats } = result;
    const slotsPerEpoch = await this.rollupConfigService.getSlotsPerEpoch();
    const currentEpochFromRpc = await this.rollupConfigService.getCurrentOnChainEpoch();

    this.logger.info(`Current on-chain epoch: ${currentEpochFromRpc}`);
    this.allProcessedEpochsInCycle.clear();

    const validatorAddresses = Object.keys(stats);
    const numValidators = validatorAddresses.length;

    this.logger.info(`Processing stats for ${numValidators} validators`);

    let totalSuccessCount = 0;

    // Process validators in batches
    for (let i = 0; i < numValidators; i += config.VALIDATOR_STATS_BATCH_SIZE) {
      const batchAddresses = validatorAddresses.slice(i, i + config.VALIDATOR_STATS_BATCH_SIZE);
      const batchNumber = Math.floor(i / config.VALIDATOR_STATS_BATCH_SIZE) + 1;

      const batchPromises = batchAddresses.map(async address => {
        try {
          // Convert SDK type to internal type
          const validatorStats: ValidatorStatDetail = {
            address: stats[address].address,
            history: stats[address].history.map(h => ({
              slot: h.slot,
              status: h.status,
            })),
          };

          const result = await this.validatorService.processValidatorStats(
            validatorStats,
            currentEpochFromRpc,
            slotsPerEpoch,
            config.VALIDATOR_STATS_MAX_PAST_EPOCHS,
            this.epochService
          );
          return result;
        } finally {
          totalSuccessCount++;
        }
      });

      const settledResults = await Promise.allSettled(batchPromises);

      settledResults.forEach((settledResult, index) => {
        const address = batchAddresses[index];
        if (settledResult.status === 'fulfilled') {
          const epochsFromValidator = settledResult.value;
          epochsFromValidator.forEach(epoch => this.allProcessedEpochsInCycle.add(epoch));
        } else {
          this.logger.error(`Failed to process validator ${address}`, { settledResult });
          totalSuccessCount--;
        }
      });

      const progress = Math.floor((totalSuccessCount / numValidators) * 100);
      this.logger.info(`Processing progress: ${progress}% (${totalSuccessCount}/${numValidators} validators) batch ${batchNumber}`);
    }

    this.logger.info(`Total: ${totalSuccessCount}/${numValidators} validators processed successfully`);

    // Update epoch aggregates for all touched epochs
    if (this.allProcessedEpochsInCycle.size > 0) {
      this.logger.info(`Updating aggregates for ${this.allProcessedEpochsInCycle.size} epochs`);

      const epochNumbers = Array.from(this.allProcessedEpochsInCycle);
      const epochAggregateResults = await Promise.allSettled(
        epochNumbers.map(epochNumber =>
          this.epochService.updateEpochAggregates(epochNumber)
        )
      );

      epochAggregateResults
        .map((result, index) => ({ epochNumber: epochNumbers[index], result }))
        .sort((a, b) => Number(a.epochNumber) - Number(b.epochNumber))
        .forEach(({ epochNumber, result }) => {
          if (result.status === 'rejected') {
            this.logger.error(`Failed to update aggregates for epoch ${epochNumber}`, {
              reason: result.reason,
            });
          }
        });

      this.logger.info('Finished updating epoch aggregates');
    }
  }

  async collectData(): Promise<void> {
    if (this.metrics.isRunning) {
      this.logger.info('Collection already in progress. Skipping.');
      return;
    }

    this.startRun();
    const startTime = Date.now();

    try {
      // Use SDK directly
      const statsResult = await this.aztec.getValidatorsStats();

      if (!statsResult) {
        await this.recordError('No stats response received');
        return;
      }

      await this.processValidatorStats(statsResult);
      this.recordSuccess(Date.now() - startTime);
    } catch (error) {
      await this.recordError(error instanceof Error ? error.message : String(error));
      this.logger.error('Collection failed', { error });
    } finally {
      this.metrics.isRunning = false;
    }
  }

  async start(): Promise<void> {
    this.logger.info(`Started. Polling every ${config.VALIDATOR_STATS_POLL_INTERVAL_MS / 1000}s`);
    this.collectData().catch(err => this.logger.error('Initial collection failed', { err }));
    setInterval(() => this.collectData().catch(err => this.logger.error('Collection failed', { err })), config.VALIDATOR_STATS_POLL_INTERVAL_MS);
  }

  protected async checkDependencies(): Promise<HealthStatus['dependencies']> {
    const [dbHealth, rpcHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkRpcHealth(config.VALIDATOR_STATS_RPC_URL, 'node_getValidatorsStats', []),
    ]);
    return { database: dbHealth, rpc: rpcHealth };
  }
}

export { ValidatorStatsCollector };
