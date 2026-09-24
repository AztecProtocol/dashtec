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
  // Per-contract, because a rollup upgrade redeploys only the rollup and its
  // slashing proposer; the rest keep their addresses and their history. Each
  // falls back to the rollup's block when discovery has not supplied one.
  'START_BLOCK': config.ponder.startBlock,
  'START_BLOCK_SLASHING_PROPOSER': config.ponder.startBlocks?.slashingProposer ?? config.ponder.startBlock,
  'START_BLOCK_GSE': config.ponder.startBlocks?.gse ?? config.ponder.startBlock,
  'START_BLOCK_REGISTRY': config.ponder.startBlocks?.registry ?? config.ponder.startBlock,
  'START_BLOCK_GOVERNANCE': config.ponder.startBlocks?.governance ?? config.ponder.startBlock,
  'START_BLOCK_GOVERNANCE_PROPOSER': config.ponder.startBlocks?.governanceProposer ?? config.ponder.startBlock,
  'START_BLOCK_STAKING_REGISTRY': config.ponder.startBlocks?.stakingRegistry ?? config.ponder.startBlock,
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
