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
  'SLOTS_PER_EPOCH': proxy.slotsPerEpoch || 32,
  'ARCHIVER_THRESHOLD_EPOCHS': proxy.archiverThresholdEpochs || 100,
  'EXPECTED_VALIDATORS': proxy.expectedValidators || 24,
  'INTEGRITY_SCORE_THRESHOLD': proxy.integrityScoreThreshold || 95,

  '#logging': 'Logging',
  'LOG_LEVEL': config.logging.level,
};

// Target: services/sentinel-proxy-go/.env
const content = buildEnvContent(network, envMap);
const envPath = join(ROOT_DIR, 'services', 'sentinel-proxy-go', '.env');

// Ensure directory exists or let writeFileSync fail if strict. 
// Standard structure implies 'services/sentinel-proxy-go' exists.

writeFileSync(envPath, content);
console.log(`✓ Generated services/sentinel-proxy-go/.env for ${network}`);
