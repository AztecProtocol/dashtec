import { BaseCollector, HealthStatus } from '../lib/BaseCollector';
import { config } from '../config/config';
import { ValidatorService } from '../services/ValidatorService';
import { ValidatorMigrationService } from '../services/ValidatorMigrationService';
import { PrismaClient, createCustomPrismaClient } from '@dashtec/database';
import { prisma } from '../lib/prisma';

interface ValidatorSocialData {
  address: string;
  x_handle?: string;
  x_user_id?: string;
  x_image_url?: string;
  discordId?: string;
  discordUsername?: string;
  discordAvatar?: string;
  name?: string;
}

/**
 * Validator Migration Collector
 * Migrates validator social media information from a source database
 */
class ValidatorMigrationCollector extends BaseCollector {
  private readonly validatorService: ValidatorService;
  private readonly validatorMigrationService: ValidatorMigrationService;
  private sourcePrisma: PrismaClient | null = null;
  private readonly enabled: boolean;

  constructor() {
    super('ValidatorMigrationCollector', 3);

    this.validatorService = new ValidatorService();
    this.validatorMigrationService = new ValidatorMigrationService();
    this.enabled = config.VALIDATOR_MIGRATION_ENABLED;

    if (!config.VALIDATOR_MIGRATION_SOURCE_DB_URL) {
      this.logger.warn('Source database URL not configured. Migration will be skipped.');
    }

    this.logger.info('Initialized', {
      pollIntervalMs: config.VALIDATOR_MIGRATION_POLL_INTERVAL_MS,
      batchSize: config.VALIDATOR_MIGRATION_BATCH_SIZE,
      enabled: this.enabled,
    });
  }

  /**
   * Initialize connection to source database
   */
  private async initializeSourceConnection(): Promise<void> {
    if (!config.VALIDATOR_MIGRATION_SOURCE_DB_URL) {
      throw new Error('Source database URL not configured');
    }

    if (!this.sourcePrisma) {
      this.sourcePrisma = createCustomPrismaClient(config.VALIDATOR_MIGRATION_SOURCE_DB_URL);
      await this.sourcePrisma.$connect();
      this.logger.info('Connected to source database');
    }
  }

  async collectData(): Promise<void> {
    if (this.metrics.isRunning) {
      this.logger.info('Collection already in progress. Skipping.');
      return;
    }

    this.startRun();
    const startTime = Date.now();

    this.logger.info('Starting validator social data migration');

    try {
      if (!config.VALIDATOR_MIGRATION_SOURCE_DB_URL) {
        this.logger.warn('Source database URL not configured. Skipping migration.');
        this.recordSuccess(Date.now() - startTime);
        return;
      }

      const currentValidators = await this.validatorMigrationService.getUnprocessedValidators();

      if (currentValidators.length === 0) {
        this.logger.info('No unprocessed validators found');
        this.recordSuccess(Date.now() - startTime);
        return;
      }

      this.logger.info(`Found ${currentValidators.length} validators to process`);

      let successCount = 0;
      let errorCount = 0;
      let notFoundCount = 0;
      let noChangesCount = 0;
      let foundNoSocialCount = 0;

      await this.initializeSourceConnection();

      if (!this.sourcePrisma) {
        throw new Error('Source database connection not available');
      }

      const totalBatches = Math.ceil(currentValidators.length / config.VALIDATOR_MIGRATION_BATCH_SIZE);

      for (let i = 0; i < currentValidators.length; i += config.VALIDATOR_MIGRATION_BATCH_SIZE) {
        const batch = currentValidators.slice(i, i + config.VALIDATOR_MIGRATION_BATCH_SIZE);
        const batchNum = Math.floor(i / config.VALIDATOR_MIGRATION_BATCH_SIZE) + 1;

        this.logger.info(`Processing batch ${batchNum}/${totalBatches} (${batch.length} validators)`);

        const results = await Promise.allSettled(
          batch.map(validatorAddress =>
            this.validatorMigrationService.processValidatorMigration(validatorAddress, this.sourcePrisma!)
          )
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const validatorResult = result.value;
            switch (validatorResult.status) {
              case 'success':
                successCount++;
                break;
              case 'no_changes':
                noChangesCount++;
                break;
              case 'not_found':
                notFoundCount++;
                break;
              case 'found_no_social':
                foundNoSocialCount++;
                break;
              case 'error':
                errorCount++;
                break;
            }
          } else {
            errorCount++;
            this.logger.error('Promise rejected for validator', {
              error: result.reason,
              validator: batch[index]
            });
          }
        });

        this.logger.info(`Batch ${batchNum} complete`);
      }

      this.logger.info('Finished migration', {
        totalValidators: currentValidators.length,
        successCount,
        noChangesCount,
        foundNoSocialCount,
        notFoundCount,
        errorCount,
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
    if (!this.enabled) {
      this.logger.info('Collector is disabled. Not starting.');
      return;
    }

    this.logger.info(`Started. Polling every ${config.VALIDATOR_MIGRATION_POLL_INTERVAL_MS / 1000}s`);
    this.collectData().catch(err => this.logger.error('Initial collection failed', { err }));
    setInterval(() => this.collectData().catch(err => this.logger.error('Collection failed', { err })), config.VALIDATOR_MIGRATION_POLL_INTERVAL_MS);
  }

  async shutdown() {
    this.logger.info('Shutting down');

    if (this.sourcePrisma) {
      await this.sourcePrisma.$disconnect();
      this.logger.info('Disconnected from source database');
    }

    await super.shutdown();
  }

  protected async checkDependencies(): Promise<HealthStatus['dependencies']> {
    const dbHealth = await this.checkDatabaseHealth();

    const dependencies: HealthStatus['dependencies'] = {
      database: dbHealth,
    };

    if (config.VALIDATOR_MIGRATION_SOURCE_DB_URL) {
      try {
        await this.initializeSourceConnection();
        if (this.sourcePrisma) {
          await this.sourcePrisma.$queryRaw`SELECT 1`;
          dependencies.sourceDatabase = {
            status: 'HEALTHY',
            message: 'Source database connection successful',
            timestamp: new Date().toISOString(),
          };
        }
      } catch (error) {
        dependencies.sourceDatabase = {
          status: 'UNHEALTHY',
          message: `Source database check failed: ${(error as Error).message}`,
          timestamp: new Date().toISOString(),
        };
      }
    } else {
      dependencies.sourceDatabase = {
        status: 'UNHEALTHY',
        message: 'Source database URL not configured',
        timestamp: new Date().toISOString(),
      };
    }

    return dependencies;
  }
}

export { ValidatorMigrationCollector };


