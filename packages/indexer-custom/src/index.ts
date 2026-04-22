import { ValidatorStatsCollector } from './collectors/ValidatorStatsCollector';
import { ValidatorListCollector } from './collectors/ValidatorListCollector';
import { EpochIntegrityCollector } from './collectors/EpochIntegrityCollector';
import { EpochAggregatesCollector } from './collectors/EpochAggregatesCollector';
import { ValidatorMigrationCollector } from './collectors/ValidatorMigrationCollector';
import { ProviderListCollector } from './collectors/ProviderListCollector';
import { TokenPriceCollector } from './collectors/TokenPriceCollector'
import { createLogger } from '@dashtec/shared-utils';

const logger = createLogger('IndexerCustom');

async function main() {
  logger.info('Starting all collectors...');

  const statsCollector = new ValidatorStatsCollector();
  const listCollector = new ValidatorListCollector();
  const integrityCollector = new EpochIntegrityCollector();
  const aggregatesCollector = new EpochAggregatesCollector();
  const migrationCollector = new ValidatorMigrationCollector();
  const providerListCollector = new ProviderListCollector();
  const tokenPriceCollector = new TokenPriceCollector()

  await Promise.all([
    statsCollector.start(),
    listCollector.start(),
    integrityCollector.start(),
    aggregatesCollector.start(),
    migrationCollector.start(),
    providerListCollector.start(),
    tokenPriceCollector.start()
  ]);

  logger.info('All collectors started successfully');

  const gracefulShutdown = async () => {
    logger.info('Received shutdown signal. Shutting down gracefully...');
    await Promise.all([
      statsCollector.shutdown(),
      listCollector.shutdown(),
      integrityCollector.shutdown(),
      aggregatesCollector.shutdown(),
      migrationCollector.shutdown(),
      providerListCollector.shutdown(),
      tokenPriceCollector.shutdown()
    ]);
    logger.info('Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

main().catch(error => {
  logger.error('Failed to start collectors', { error });
  process.exit(1);
});
