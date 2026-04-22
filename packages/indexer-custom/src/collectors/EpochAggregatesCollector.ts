import { BaseCollector, HealthStatus } from '../lib/BaseCollector';
import { config } from '../config/config';
import { EpochService } from '../services/EpochService';
import { prisma } from '../lib/prisma';

/**
 * Epoch Aggregates Collector
 * 
 * Periodically recalculates epoch performance and aggregates to fix stale data
 * caused by read replica downtime or lag.
 * 
 * Process:
 * 1. Query validatorAttestations for target epochs
 * 2. Group by validator address
 * 3. Call updateValidatorEpochPerformance for each validator+epoch
 * 4. Call updateEpochAggregates for each epoch
 */
class EpochAggregatesCollector extends BaseCollector {
  private readonly epochService: EpochService;
  constructor() {
    super('EpochAggregatesCollector', 4);

    this.epochService = new EpochService();

    this.logger.info('Initialized', {
      pollIntervalMs: config.EPOCH_AGGREGATES_POLL_INTERVAL_MS,
      epochsToRepair: config.EPOCH_AGGREGATES_EPOCHS_TO_REPAIR,
      batchSize: config.EPOCH_AGGREGATES_BATCH_SIZE,
    });
  }

  /**
   * Get epochs that need aggregate recalculation
   * Returns the last N epochs ordered by epoch number descending,
   * bounded by the current on-chain epoch to avoid processing invalid epochs
   */
  private async getEpochsToRepair(): Promise<bigint[]> {
    const epochs = await prisma.epoch.findMany({
      where: {
        rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
      },
      select: { epoch_number: true },
      orderBy: { epoch_number: 'desc' },
      take: config.EPOCH_AGGREGATES_EPOCHS_TO_REPAIR,
    });

    return epochs.map(e => e.epoch_number).reverse();
  }

  /**
   * Get unique validators with attestations in the given epochs
   */
  private async getValidatorsForEpochs(epochNumbers: bigint[]): Promise<Map<bigint, string[]>> {
    const attestations = await prisma.validatorAttestation.groupBy({
      by: ['epoch_number', 'validator_address'],
      where: {
        epoch_number: { in: epochNumbers },
        rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
      },
    });

    // Group by epoch
    const epochValidatorMap = new Map<bigint, string[]>();

    for (const att of attestations) {
      const epochNum = att.epoch_number;
      const validators = epochValidatorMap.get(epochNum) || [];
      validators.push(att.validator_address);
      epochValidatorMap.set(epochNum, validators);
    }

    return epochValidatorMap;
  }

  async collectData(): Promise<void> {
    if (this.metrics.isRunning) {
      this.logger.info('Collection already in progress. Skipping.');
      return;
    }

    this.startRun();
    const startTime = Date.now();

    this.logger.info('Starting epoch aggregate repair');

    try {
      const epochsToRepair = await this.getEpochsToRepair();

      if (epochsToRepair.length === 0) {
        this.logger.warn('No epochs found to repair');
        this.recordSuccess(Date.now() - startTime);
        return;
      }

      this.logger.info(`Repairing aggregates for ${epochsToRepair.length} epochs`);

      let validatorPerformanceSuccess = 0;
      let validatorPerformanceError = 0;
      let epochAggregateSuccess = 0;
      let epochAggregateError = 0;

      const totalBatches = Math.ceil(epochsToRepair.length / config.EPOCH_AGGREGATES_BATCH_SIZE);

      for (let i = 0; i < epochsToRepair.length; i += config.EPOCH_AGGREGATES_BATCH_SIZE) {
        const batch = epochsToRepair.slice(i, i + config.EPOCH_AGGREGATES_BATCH_SIZE);
        const batchNum = Math.floor(i / config.EPOCH_AGGREGATES_BATCH_SIZE) + 1;

        this.logger.info(`Processing batch ${batchNum}/${totalBatches} (${batch.length} epochs)`);

        // Get validators for this batch of epochs only
        const epochValidatorMap = await this.getValidatorsForEpochs(batch);

        // Process each epoch in the batch
        for (const epochNumber of batch) {
          const validators = epochValidatorMap.get(epochNumber) || [];

          if (validators.length === 0) {
            this.logger.debug(`No validators found for epoch ${epochNumber}`);
            continue;
          }

          this.logger.debug(`Updating performance for ${validators.length} validators in epoch ${epochNumber}`);

          // Ensure epoch exists for this rollup before updating performance
          await this.epochService.ensureEpochExists(epochNumber);

          // Step 1: Update validator epoch performance for each validator
          const performancePromises = validators.map(validatorAddress =>
            this.epochService.updateValidatorEpochPerformance(epochNumber, validatorAddress)
              .then(() => ({ success: true, validatorAddress }))
              .catch(error => {
                this.logger.error(`Failed to update performance for ${validatorAddress} in epoch ${epochNumber}`, { error });
                return { success: false, validatorAddress };
              })
          );

          const performanceResults = await Promise.all(performancePromises);

          for (const result of performanceResults) {
            if (result.success) {
              validatorPerformanceSuccess++;
            } else {
              validatorPerformanceError++;
            }
          }

          // Step 2: Update epoch aggregates after all validator performances are updated
          try {
            await this.epochService.updateEpochAggregates(epochNumber);
            epochAggregateSuccess++;
          } catch (error) {
            epochAggregateError++;
            this.logger.error(`Failed to update aggregates for epoch ${epochNumber}`, { error });
          }
        }

        this.logger.info(`Batch ${batchNum} complete`);
      }

      this.logger.info(`Finished epoch aggregate repair`, {
        validatorPerformance: { success: validatorPerformanceSuccess, errors: validatorPerformanceError },
        epochAggregates: { success: epochAggregateSuccess, errors: epochAggregateError },
      });

      this.recordSuccess(Date.now() - startTime);
    } catch (error) {
      this.recordError(error instanceof Error ? error.message : String(error));
      this.logger.error('Collection failed', { error });
    } finally {
      this.metrics.isRunning = false;
    }
  }

  async start(): Promise<void> {
    this.logger.info(`Started. Polling every ${config.EPOCH_AGGREGATES_POLL_INTERVAL_MS / 1000}s`);
    this.collectData().catch(err => this.logger.error('Initial collection failed', { err }));
    setInterval(() => this.collectData().catch(err => this.logger.error('Collection failed', { err })), config.EPOCH_AGGREGATES_POLL_INTERVAL_MS);
  }

  protected async checkDependencies(): Promise<HealthStatus['dependencies']> {
    const dbHealth = await this.checkDatabaseHealth();
    return { database: dbHealth };
  }
}

export { EpochAggregatesCollector };
