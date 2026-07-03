#!/usr/bin/env node

import { writeFileSync } from 'fs';
import { join } from 'path';
import { loadConfig, buildEnvContent, ROOT_DIR } from './utils.js';

const network = process.argv[2];
const config = loadConfig(network);

const envMap = {
  '#database': 'Database',
  'DATABASE_URL': config.database.url,
  'DATABASE_READ_REPLICA_URL': config.database.replicaUrl || '',

  '#redis': 'Redis',
  'REDIS_URL': config.redis?.url || '',

  '#rpc': 'RPC',
  'RPC_URLS': config.rpc.ethereumUrls,
  'VALIDATOR_STATS_RPC_URL': config.sentinel.proxyUrl,

  '#contracts': 'Contract Addresses',
  'ROLLUP_CONTRACT_ADDRESS': config.contracts.rollupAddress,

  '#validator-stats': 'Validator Stats Collector Configuration',
  'VALIDATOR_STATS_POLL_INTERVAL_MS': config.collectors.validatorStats.pollIntervalMs,
  'VALIDATOR_STATS_MAX_PAST_EPOCHS': config.collectors.validatorStats.maxPastEpochs,
  'VALIDATOR_STATS_BATCH_SIZE': config.collectors.validatorStats.batchSize,

  '#validator-list': 'Validator List Collector Configuration',
  'VALIDATOR_LIST_POLL_INTERVAL_MS': config.collectors.validatorList.pollIntervalMs,
  'VALIDATOR_LIST_BATCH_SIZE': config.collectors.validatorList.batchSize,

  '#epoch-integrity': 'Epoch Integrity Collector Configuration',
  'EPOCH_INTEGRITY_POLL_INTERVAL_MS': config.collectors.epochIntegrity.pollIntervalMs,
  'EPOCH_INTEGRITY_BATCH_SIZE': config.collectors.epochIntegrity.batchSize,
  'EPOCH_INTEGRITY_EPOCHS_TO_CHECK': config.collectors.epochIntegrity.epochsToCheck,

  '#validator-migration': 'Validator Migration Collector Configuration',
  'VALIDATOR_MIGRATION_ENABLED': config.collectors.validatorMigration.enabled,
  'VALIDATOR_MIGRATION_POLL_INTERVAL_MS': config.collectors.validatorMigration.pollIntervalMs,
  'VALIDATOR_MIGRATION_BATCH_SIZE': config.collectors.validatorMigration.batchSize,
  'VALIDATOR_MIGRATION_SOURCE_DB_URL': config.collectors.validatorMigration.sourceDbUrl || '',

  '#provider-list': 'Provider List Collector Configuration',
  'STAKING_APP_API_URL': config.collectors.providerList?.apiUrl || '',
  'PROVIDER_LIST_POLL_INTERVAL_MS': config.collectors.providerList?.pollIntervalMs || '',

  '#epoch-aggregates': 'Epoch Aggregates Collector Configuration',
  'EPOCH_AGGREGATES_POLL_INTERVAL_MS': config.collectors.epochAggregates?.pollIntervalMs || 300000,
  'EPOCH_AGGREGATES_BATCH_SIZE': config.collectors.epochAggregates?.batchSize || 10,
  'EPOCH_AGGREGATES_EPOCHS_TO_REPAIR': config.collectors.epochAggregates?.epochsToRepair || 50,

  '#logging': 'Logging',
  'LOG_LEVEL': config.logging.level,
  'NODE_ENV': config.nodeEnv,
};

const content = buildEnvContent(network, envMap);
const envPath = join(ROOT_DIR, 'packages', 'indexer-custom', `.env.${network}`);
writeFileSync(envPath, content);
console.log(`✓ Generated packages/indexer-custom/.env.${network}`);
