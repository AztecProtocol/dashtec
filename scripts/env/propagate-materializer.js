#!/usr/bin/env node

import { writeFileSync } from 'fs';
import { join } from 'path';
import { loadConfig, buildEnvContent, ROOT_DIR } from './utils.js';

const network = process.argv[2];
const config = loadConfig(network);

const envMap = {
  '#database': 'Database',
  'DATABASE_URL': config.database.url,

  '#ponder': 'Ponder Schema (must match DATABASE_SCHEMA in indexer-ponder)',
  'PONDER_SCHEMA': config.ponder.databaseSchema,

  '#contracts': 'Contracts',
  'ROLLUP_CONTRACT_ADDRESS': config.contracts.rollupAddress,

  '#logging': 'Logging',
  'LOG_LEVEL': config.logging.level,
  'NODE_ENV': config.nodeEnv,
};

const content = buildEnvContent(network, envMap);
const envPath = join(ROOT_DIR, 'packages', 'materializer', '.env');
writeFileSync(envPath, content);
console.log(`✓ Generated packages/materializer/.env for ${network}`);
