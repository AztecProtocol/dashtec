import { ValidatorStatsCollector } from './collectors/ValidatorStatsCollector';
import { ValidatorListCollector } from './collectors/ValidatorListCollector';
import { EpochIntegrityCollector } from './collectors/EpochIntegrityCollector';
import { EpochAggregatesCollector } from './collectors/EpochAggregatesCollector';
import { ValidatorMigrationCollector } from './collectors/ValidatorMigrationCollector';
import { ProviderListCollector } from './collectors/ProviderListCollector';
import { TokenPriceCollector } from './collectors/TokenPriceCollector'
import { createLogger } from '@dashtec/shared-utils';

const logger = createLogger('IndexerCustom');

/**
 * COLLECTORS selects which collectors run (comma-separated names below); all
 * of them when unset. A second instance for a previous rollup that is still
 * running only needs the ones that read its own Aztec node.
 */
const COLLECTOR_FACTORIES = {
  validatorStats: () => new ValidatorStatsCollector(),
  validatorList: () => new ValidatorListCollector(),
  epochIntegrity: () => new EpochIntegrityCollector(),
  epochAggregates: () => new EpochAggregatesCollector(),
  validatorMigration: () => new ValidatorMigrationCollector(),
  providerList: () => new ProviderListCollector(),
  tokenPrice: () => new TokenPriceCollector(),
} as const;

function selectedCollectors(): (keyof typeof COLLECTOR_FACTORIES)[] {
  const all = Object.keys(COLLECTOR_FACTORIES) as (keyof typeof COLLECTOR_FACTORIES)[];
  const requested = (process.env.COLLECTORS ?? '').split(',').map((name) => name.trim()).filter(Boolean);
  if (requested.length === 0) return all;

  const unknown = requested.filter((name) => !(name in COLLECTOR_FACTORIES));
  if (unknown.length > 0) {
    throw new Error(`Unknown COLLECTORS: ${unknown.join(', ')} (known: ${all.join(', ')})`);
  }
  return requested as (keyof typeof COLLECTOR_FACTORIES)[];
}

async function main() {
  const names = selectedCollectors();
  logger.info(`Starting collectors: ${names.join(', ')}`);

  const collectors = names.map((name) => COLLECTOR_FACTORIES[name]());

  await Promise.all(collectors.map((collector) => collector.start()));

  logger.info('All collectors started successfully');

  const gracefulShutdown = async () => {
    logger.info('Received shutdown signal. Shutting down gracefully...');
    await Promise.all(collectors.map((collector) => collector.shutdown()));
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
