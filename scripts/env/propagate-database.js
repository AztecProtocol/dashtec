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

  '#logging': 'Logging',
  'NODE_ENV': config.nodeEnv,
};

const content = buildEnvContent(network, envMap);
const envPath = join(ROOT_DIR, 'packages', 'database', '.env');
writeFileSync(envPath, content);
console.log(`✓ Generated packages/database/.env for ${network}`);
