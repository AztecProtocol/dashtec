#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const network = process.argv[2];

if (!network || !['mainnet', 'testnet'].includes(network)) {
  console.error('❌ Usage: pnpm env:propagate <mainnet|testnet>');
  process.exit(1);
}

console.log(`📦 Propagating ${network} configuration to all packages...\n`);

const scripts = [
  'propagate-database.js',
  'propagate-indexer-ponder.js',
  'propagate-indexer-custom.js',
  'propagate-materializer.js',
  'propagate-sentinel-proxy-go.js',
  'propagate-app.js',
];

for (const script of scripts) {
  try {
    execSync(`node ${join(__dirname, script)} ${network}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Failed to run ${script}`);
    process.exit(1);
  }
}

console.log('\n✅ Environment configuration propagated successfully!');
console.log(`🔧 Network: ${network}`);
