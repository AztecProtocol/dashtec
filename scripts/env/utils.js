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

  return JSON.parse(readFileSync(configPath, 'utf-8'));
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
