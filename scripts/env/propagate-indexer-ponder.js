#!/usr/bin/env node

import { writeFileSync } from 'fs';
import { join } from 'path';
import { loadConfig, buildEnvContent, ROOT_DIR } from './utils.js';

const network = process.argv[2];
const config = loadConfig(network);

const envMap = {
  '#database': 'Database',
  'DATABASE_URL': config.database.url,

  '#rpc': 'RPC',
  'RPC_URLS': config.rpc.ethereumUrls,

  '#contracts': 'Contract Addresses',
  'ROLLUP_CONTRACT_ADDRESS': config.contracts.rollupAddress,
  'GOVERNANCE_CONTRACT_ADDRESS': config.contracts.governanceAddress,
  'GOVERNANCE_PROPOSER_CONTRACT_ADDRESS': config.contracts.governanceProposerAddress,
  'SLASHING_PROPOSER_CONTRACT_ADDRESS': config.contracts.slashingProposerAddress,
  'GSE_CONTRACT_ADDRESS': config.contracts.gseAddress,
  'STAKING_REGISTRY_CONTRACT_ADDRESS': config.contracts.stakingRegistryAddress,
  'REGISTRY_CONTRACT_ADDRESS': config.contracts.registryAddress,

  '#ponder': 'Ponder Configuration',
  'DATABASE_SCHEMA': config.ponder.databaseSchema,
  'PORT': config.ponder.port,
  'MAX_HEALTHCHECK_DURATION': config.ponder.maxHealthcheckDuration,
  'START_BLOCK': config.ponder.startBlock,
  'REDIS_URL': config.ponder.redis?.url,

  '#network': 'Network',
  'NETWORK_TYPE': config.network.type,
  'CHAIN_ID': config.network.chainId,

  '#logging': 'Logging',
  'LOG_LEVEL': config.logging.level,
  'NODE_ENV': config.nodeEnv,
};

const content = buildEnvContent(network, envMap);
const envPath = join(ROOT_DIR, 'packages', 'indexer-ponder', `.env.${network}`);
writeFileSync(envPath, content);
console.log(`✓ Generated packages/indexer-ponder/.env.${network}`);
