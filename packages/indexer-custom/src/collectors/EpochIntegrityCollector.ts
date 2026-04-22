import { BaseCollector, HealthStatus } from '../lib/BaseCollector';
import { config } from '../config/config';
import { EpochIntegrityStatsService } from '../services/EpochIntegrityStatsService';
import { RollupConfigService } from '../services/RollupConfigService';

/**
 * Epoch Integrity Collector
 * Orchestrates epoch integrity validation by coordinating service calls
 */
class EpochIntegrityCollector extends BaseCollector {
  private readonly epochIntegrityStatsService: EpochIntegrityStatsService;
  private readonly rollupConfigService: RollupConfigService;

  constructor() {
    super('EpochIntegrityCollector', 2);

    this.epochIntegrityStatsService = new EpochIntegrityStatsService();
    this.rollupConfigService = RollupConfigService.getInstance();

    this.logger.info('Initialized', {
      pollIntervalMs: config.EPOCH_INTEGRITY_POLL_INTERVAL_MS,
      batchSize: config.EPOCH_INTEGRITY_BATCH_SIZE,
      epochsToCheck: config.EPOCH_INTEGRITY_EPOCHS_TO_CHECK,
    });
  }

  /**
   * Get epoch configuration from rollup contract
   */
  private async getEpochConfig(epochNumber: bigint): Promise<{ expectedValidatorsPerEpoch: number; slotsPerEpoch: number }> {
    const [epochCommittee, slotsPerEpochBigInt] = await Promise.all([
      this.rollupConfigService.getEpochCommittee(epochNumber),
      this.rollupConfigService.getSlotsPerEpoch()
    ]);

    return {
      expectedValidatorsPerEpoch: epochCommittee.length,
      slotsPerEpoch: Number(slotsPerEpochBigInt)
    };
  }

  async collectData(): Promise<void> {
    if (this.metrics.isRunning) {
      this.logger.info('Collection already in progress. Skipping.');
      return;
    }

    this.startRun();
    const startTime = Date.now();

    this.logger.info('Starting data integrity check');

    try {
      const currentOnChainEpoch = await this.rollupConfigService.getCurrentOnChainEpoch();
      const epochsToCheck = await this.epochIntegrityStatsService.getEpochsToCheck(config.EPOCH_INTEGRITY_EPOCHS_TO_CHECK, currentOnChainEpoch);
      if (epochsToCheck.length === 0) {
        this.logger.warn('No epochs found to check');
        this.recordSuccess(Date.now() - startTime);
        return;
      }

      this.logger.info(`Checking integrity for ${epochsToCheck.length} epochs`);

      let successCount = 0;
      let errorCount = 0;
      let issuesCount = 0;

      const totalBatches = Math.ceil(epochsToCheck.length / config.EPOCH_INTEGRITY_BATCH_SIZE);

      for (let i = 0; i < epochsToCheck.length; i += config.EPOCH_INTEGRITY_BATCH_SIZE) {
        const batch = epochsToCheck.slice(i, i + config.EPOCH_INTEGRITY_BATCH_SIZE);
        const batchNum = Math.floor(i / config.EPOCH_INTEGRITY_BATCH_SIZE) + 1;

        this.logger.info(`Processing batch ${batchNum}/${totalBatches} (${batch.length} epochs)`);

        const batchPromises = batch.map(async epochNumber => {
          const { expectedValidatorsPerEpoch, slotsPerEpoch } = await this.getEpochConfig(epochNumber);
          return this.epochIntegrityStatsService.analyzeAndSave(epochNumber, expectedValidatorsPerEpoch, slotsPerEpoch);
        });

        const results = await Promise.allSettled(batchPromises);

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const { status, hasIssues } = result.value;
            if (status === 'success') {
              successCount++;
              if (hasIssues) issuesCount++;
            } else {
              errorCount++;
            }
          } else {
            errorCount++;
            this.logger.error(`Failed to process epoch ${batch[index]}`, { error: result.reason });
          }
        });

        this.logger.info(`Batch ${batchNum} complete`);
      }

      this.logger.info(`Finished integrity check. Success: ${successCount}, Errors: ${errorCount}, Epochs with issues: ${issuesCount}`);

      this.recordSuccess(Date.now() - startTime);
    } catch (error) {
      this.recordError(error instanceof Error ? error.message : String(error));
      this.logger.error('Collection failed', { error });
    } finally {
      this.metrics.isRunning = false;
    }
  }

  async start(): Promise<void> {
    this.logger.info(`Started. Polling every ${config.EPOCH_INTEGRITY_POLL_INTERVAL_MS / 1000}s`);
    this.collectData().catch(err => this.logger.error('Initial collection failed', { err }));
    setInterval(() => this.collectData().catch(err => this.logger.error('Collection failed', { err })), config.EPOCH_INTEGRITY_POLL_INTERVAL_MS);
  }

  protected async checkDependencies(): Promise<HealthStatus['dependencies']> {
    const dbHealth = await this.checkDatabaseHealth();
    return { database: dbHealth };
  }
}

export { EpochIntegrityCollector };


