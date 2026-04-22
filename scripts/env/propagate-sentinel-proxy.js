#!/usr/bin/env node

import { writeFileSync } from 'fs';
import { join } from 'path';
import { loadConfig, buildEnvContent, ROOT_DIR } from './utils.js';

const network = process.argv[2];
const config = loadConfig(network);

// Build backends string from config
const backends = [
  config.sentinel.backends.archiverUrl,
  config.sentinel.backends.prunedUrl,
].filter(Boolean).join(',');

const proxy = config.sentinel.proxy;

const envMap = {
  '#sentinel': 'Sentinel Backends',
  'SENTINEL_BACKENDS': backends,

  '#proxy': 'Proxy Configuration',
  'PROXY_PORT': proxy.port,
  'HEALTH_CHECK_INTERVAL_MS': proxy.healthCheckIntervalMs,
  'INTEGRITY_CHECK_INTERVAL_MS': proxy.integrityCheckIntervalMs,
  'INTEGRITY_CHECK_EPOCHS': proxy.integrityCheckEpochs,
  'REQUEST_TIMEOUT_MS': proxy.requestTimeoutMs,
  'SLOTS_PER_EPOCH': proxy.slotsPerEpoch,
  'ARCHIVER_THRESHOLD_EPOCHS': proxy.archiverThresholdEpochs,
  'EXPECTED_VALIDATORS': proxy.expectedValidators,

  '#logging': 'Logging',
  'LOG_LEVEL': config.logging.level,
};

const content = buildEnvContent(network, envMap);
const envPath = join(ROOT_DIR, 'packages', 'sentinel-proxy', '.env');
writeFileSync(envPath, content);
console.log(`✓ Generated packages/sentinel-proxy/.env for ${network}`);

