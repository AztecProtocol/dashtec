import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const ROOT_DIR = join(__dirname, '..', '..');

/**
 * Load configuration from .environment/{network}/config.json
 */
export function loadConfig(network) {
  if (!network || !['mainnet', 'testnet'].includes(network)) {
    console.error('❌ Usage: pnpm env:propagate:<package> <mainnet|testnet>');
    process.exit(1);
  }

  const configPath = join(ROOT_DIR, '.environment', network, 'config.json');

  if (!existsSync(configPath)) {
    console.error(`❌ Config file not found: ${configPath}`);
    console.error(`💡 Copy config.example.json to config.json and fill in your values`);
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  assertDiscovered(config, network);
  return config;
}

/**
 * Contract addresses are filled in by scripts/env/discover-contracts.js from the
 * running Aztec node, and ship as zero-address placeholders. Propagating those
 * would produce .env files that pass every downstream regex check and then index
 * nothing, so fail here instead — a loud stop is much cheaper to diagnose than an
 * indexer that quietly stays empty.
 */
function assertDiscovered(config, network) {
  const ZERO = '0x0000000000000000000000000000000000000000';
  const undiscovered = Object.entries(config.contracts ?? {})
    .filter(([key, value]) => !key.startsWith('_') && String(value).toLowerCase() === ZERO)
    .map(([key]) => key);

  if (undiscovered.length === 0) return;

  console.error(`❌ ${network}: contract addresses are still placeholders: ${undiscovered.join(', ')}`);
  console.error('💡 Start the Aztec node and discover them first:');
  console.error(`     docker compose --profile ${network} up -d --wait aztec-node-${network}`);
  console.error(`     pnpm env:discover ${network}`);
  process.exit(1);
}

/**
 * Generate environment file header
 */
export function generateHeader(network) {
  return `# Generated from .environment/${network}/config.json
# Do not edit manually - run: pnpm env:propagate:<package> <mainnet|testnet>

`;
}

/**
 * Build .env file content from a simple object mapping
 * @param {string} network - Network name (mainnet/testnet)
 * @param {Object} envMap - Object where keys are env var names and values are their values
 * @returns {string} - Complete .env file content
 */
export function buildEnvContent(network, envMap) {
  let content = generateHeader(network);

  for (const [key, value] of Object.entries(envMap)) {
    // Skip empty/undefined values
    if (value === undefined || value === null) continue;

    // Section headers (keys starting with #)
    if (key.startsWith('#')) {
      content += `\n# ${value}\n`;
    } else {
      content += `${key}="${value}"\n`;
    }
  }

  return content;
}
