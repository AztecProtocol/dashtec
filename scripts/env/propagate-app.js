#!/usr/bin/env node

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { loadConfig, buildEnvContent, ROOT_DIR } from './utils.js';

const network = process.argv[2];
const config = loadConfig(network);

const envMapRuntime = {
  '#database': 'Database',
  'DATABASE_URL': config.database.url,
  'DATABASE_URL_REPLICA': config.database.replicaUrl || '',

  '#session': 'Session',
  'SESSION_PASSWORD': config.app.auth.sessionPassword,

  '#contracts': 'Contract Addresses',
  'ROLLUP_CONTRACT_ADDRESS': config.contracts.rollupAddress,
  'SLASHING_PROPOSER_CONTRACT_ADDRESS': config.contracts.slashingProposerAddress,
  'GOVERNANCE_PROPOSER_CONTRACT_ADDRESS': config.contracts.governanceProposerAddress,
  'STAKING_REGISTRY_CONTRACT_ADDRESS': config.contracts.stakingRegistryAddress,

  '#network': 'Network Configuration',
  'ETHEREUM_RPC_URL': config.rpc.ethereumUrls,
  // Our own Aztec node (docker-compose service `aztec-node-<network>`), which
  // serves the node_* JSON-RPC methods the sentinel proxy used to front.
  'NEXT_SENTINEL_URL': config.aztecNode.url,
  'ETHEREUM_EXPLORER_URL': config.app.ethereumExplorerUrl,
  'AZTEC_SCAN_URL': config.app.aztecScanUrl || '',
  'CHAIN_NAME': config.network.type,

  '#discord': 'Discord OAuth',
  'DISCORD_CLIENT_ID': config.app.auth.discord.clientId,
  'DISCORD_CLIENT_SECRET': config.app.auth.discord.clientSecret,

  '#x': 'X (Twitter) OAuth',
  'X_CLIENT_ID': config.app.auth.x.clientId,
  'X_CLIENT_SECRET': config.app.auth.x.clientSecret,

  '#app': 'Application',
  'APP_URL': config.app.url,
  'RATE_LIMITING_ENABLED': config.app.rateLimitingEnabled.toString(),
  'PORT': config.app.port.toString(),
  'NODE_ENV': config.nodeEnv,

  '#redis': 'Redis',
  'REDIS_URL': config.redis?.url || '',

  '#logging': 'Logging (Optional)',
  'LOG_LEVEL': config.logging.level || 'info',
};


// Baked into the client bundle by `next build` (Dockerfile copies this to
// apps/web/.env.production). CHAIN_NAME is included because next.config.ts falls
// back to it — it is otherwise a runtime-only var, and leaving it out of the
// build env is how a stale apps/web/.env once decided the network switcher's
// default.
const envMapBuild = {
  'ETHEREUM_EXPLORER_URL': config.app.ethereumExplorerUrl,
  'NEXT_PUBLIC_MAINNET_DOMAIN': config.app.domains?.mainnet || 'dashtec.xyz',
  'NEXT_PUBLIC_TESTNET_DOMAIN': config.app.domains?.sepolia || 'testnet.dashtec.xyz',
  'NEXT_PUBLIC_NETWORK_TYPE': config.network.type,
  'CHAIN_NAME': config.network.type,
};

const appsDir = join(ROOT_DIR, 'apps', 'web');
if (!existsSync(appsDir)) {
  mkdirSync(appsDir, { recursive: true });
}

const contentRuntime = buildEnvContent(network, envMapRuntime);
const contentBuild = buildEnvContent(network, envMapBuild);
writeFileSync(join(appsDir, `.env.${network}`), contentRuntime);
writeFileSync(join(appsDir, `.env.build.${network}`), contentBuild);
console.log(`✓ Generated apps/web/.env.${network}`);
console.log(`✓ Generated apps/web/.env.build.${network}`);
