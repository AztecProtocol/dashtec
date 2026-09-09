#!/usr/bin/env node

/**
 * Discover the Aztec V5 L1 contract addresses from our own Aztec node and write
 * them into .environment/<network>/config.json.
 *
 * Aztec upgrades (v4 -> v5 and beyond) redeploy the rollup and the reward
 * distributor and repoint the Registry at them, so pinning addresses by hand
 * goes stale on every upgrade. The node already resolves them, so we ask it.
 *
 * Sources:
 *   - Aztec node `node_getL1ContractAddresses`: rollup, registry, governance,
 *     governanceProposer, gse.
 *   - L1 `eth_call` Rollup.getSlasher() then Slasher.PROPOSER(): the slashing
 *     proposer, which the node does not expose.
 *   - L1 `eth_getCode` binary search: the rollup's deployment block, used as
 *     Ponder's startBlock so a fresh index neither misses events nor scans
 *     years of empty history.
 *
 * `stakingRegistryAddress` is not part of the Aztec core deployment and is left
 * untouched.
 *
 * No dependencies — this runs under a bare `node:20-alpine` during deploys, the
 * same way scripts/env/propagate-all.js does.
 *
 * Usage: node scripts/env/discover-contracts.js <mainnet|testnet>
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ROOT_DIR } from './utils.js';

const ZERO = '0x0000000000000000000000000000000000000000';

// keccak256("getSlasher()") and keccak256("PROPOSER()"), first 4 bytes. Hardcoded
// because this script must run without an ABI/keccak dependency; both signatures
// are stable across V5 (IStaking.getSlasher, Slasher.PROPOSER).
const SELECTOR_GET_SLASHER = '0xd0c80f13';
const SELECTOR_PROPOSER = '0xbffa7f0f';

const network = process.argv[2];
if (!network || !['mainnet', 'testnet'].includes(network)) {
  console.error('❌ Usage: node scripts/env/discover-contracts.js <mainnet|testnet>');
  process.exit(1);
}

const configPath = join(ROOT_DIR, '.environment', network, 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

const nodeUrl = config.aztecNode?.url;
if (!nodeUrl) {
  console.error(`❌ ${configPath} has no aztecNode.url`);
  process.exit(1);
}

const l1Urls = String(config.rpc?.ethereumUrls || '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);
if (l1Urls.length === 0) {
  console.error(`❌ ${configPath} has no rpc.ethereumUrls`);
  process.exit(1);
}
const l1Url = l1Urls[0];

let nextId = 1;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Single JSON-RPC call, retrying on throttling and transient transport errors.
 *
 * The deployment-block search below is ~25 sequential eth_getCode calls, which is
 * enough to trip the rate limit on an unauthenticated public endpoint — Sepolia's
 * Tenderly gateway answers 429 partway through and the whole deploy fails. Retry
 * with exponential backoff and honour Retry-After when the server sends it.
 *
 * Only throttling, 5xx and network errors are retried. A JSON-RPC error (a
 * pruned-state response, say) is a real answer and is surfaced immediately.
 */
async function rpc(url, method, params = [], { timeoutMs = 30_000, attempts = 6 } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      // Transport-level failure (timeout, DNS, connection reset).
      lastError = new Error(`${method}: ${error.message} (${redact(url)})`);
      if (attempt === attempts) break;
      await sleep(backoffMs(attempt));
      continue;
    }

    if (response.status === 429 || response.status >= 500) {
      lastError = new Error(`${method}: HTTP ${response.status} from ${redact(url)}`);
      if (attempt === attempts) break;
      const retryAfter = Number(response.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 30_000)
        : backoffMs(attempt));
      continue;
    }

    if (!response.ok) {
      throw new Error(`${method}: HTTP ${response.status} from ${redact(url)}`);
    }

    const payload = await response.json();
    if (payload.error) {
      throw new Error(`${method}: ${payload.error.message ?? JSON.stringify(payload.error)}`);
    }
    return payload.result;
  }

  throw lastError;
}

/** 1s, 2s, 4s, 8s, 16s (capped), with jitter so retries don't align. */
function backoffMs(attempt) {
  return Math.min(1000 * 2 ** (attempt - 1), 16_000) + Math.floor(Math.random() * 250);
}

/** Strip credentials/api keys so RPC URLs are safe to print in deploy logs. */
function redact(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/…`;
  } catch {
    return '<rpc>';
  }
}

/** Last 20 bytes of a 32-byte eth_call return value, as a lowercase address. */
function addressFromWord(word) {
  if (typeof word !== 'string' || word.length < 42) {
    throw new Error(`expected a 32-byte word, got ${JSON.stringify(word)}`);
  }
  return `0x${word.slice(-40)}`.toLowerCase();
}

function requireAddress(value, label) {
  const address = String(value ?? '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) {
    throw new Error(`${label} is not an address: ${JSON.stringify(value)}`);
  }
  if (address === ZERO) {
    throw new Error(`${label} is the zero address — the node is not reporting a V5 deployment`);
  }
  return address;
}

/**
 * Lowest block at which `address` has code. Binary search over eth_getCode:
 * ~log2(headBlock) calls, versus scanning logs from genesis.
 *
 * Those calls are sequential and land within a couple of seconds, which is
 * enough to trip a public endpoint's rate limit even though the total is small.
 * `rpc()` retries on 429, but a short pause between probes avoids most of them —
 * ~25 probes, so the added wall-clock is a few seconds either way.
 */
async function findDeploymentBlock(address) {
  const PROBE_SPACING_MS = 150;

  const head = Number(await rpc(l1Url, 'eth_blockNumber', []));
  const hasCode = async (block) => {
    const code = await rpc(l1Url, 'eth_getCode', [address, `0x${block.toString(16)}`]);
    await sleep(PROBE_SPACING_MS);
    return typeof code === 'string' && code !== '0x' && code !== '0x0';
  };

  if (!(await hasCode(head))) {
    throw new Error(`no code at ${address} on the L1 chain head — wrong network?`);
  }

  let low = 0;
  let high = head;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (await hasCode(mid)) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
}

console.log(`🔍 Discovering ${network} contracts from ${redact(nodeUrl)}\n`);

let addresses;
try {
  addresses = await rpc(nodeUrl, 'node_getL1ContractAddresses', []);
} catch (error) {
  console.error(`❌ Could not reach the Aztec node at ${redact(nodeUrl)}: ${error.message}`);
  console.error('   Start it first, e.g.');
  console.error(`   docker compose --profile ${network} up -d --wait aztec-node-${network}`);
  process.exit(1);
}

const discovered = {
  rollupAddress: requireAddress(addresses.rollupAddress, 'rollupAddress'),
  registryAddress: requireAddress(addresses.registryAddress, 'registryAddress'),
  governanceAddress: requireAddress(addresses.governanceAddress, 'governanceAddress'),
  governanceProposerAddress: requireAddress(
    addresses.governanceProposerAddress,
    'governanceProposerAddress',
  ),
};

// gseAddress is optional in the node's schema, but dashtec's Ponder config
// requires it — fail loudly rather than indexing against the zero address.
discovered.gseAddress = requireAddress(addresses.gseAddress, 'gseAddress');

// The slashing proposer is reachable only through the rollup's slasher, and the
// startBlock from the rollup's own deployment — both L1 reads.
let slasher;
let startBlock;
try {
  slasher = addressFromWord(
    await rpc(l1Url, 'eth_call', [{ to: discovered.rollupAddress, data: SELECTOR_GET_SLASHER }, 'latest']),
  );
  discovered.slashingProposerAddress = requireAddress(
    addressFromWord(await rpc(l1Url, 'eth_call', [{ to: slasher, data: SELECTOR_PROPOSER }, 'latest'])),
    'slashingProposerAddress',
  );
  startBlock = await findDeploymentBlock(discovered.rollupAddress);
} catch (error) {
  console.error(`❌ L1 lookup against ${redact(l1Url)} failed: ${error.message}`);
  process.exit(1);
}

// Aztec V5 deleted SlashFactory.sol, so drop the key from configs written by an
// earlier dashtec rather than leaving a dead address behind.
delete config.contracts.slashFactoryAddress;

const before = { ...config.contracts };
config.contracts = { ...config.contracts, ...discovered };
config.ponder = { ...config.ponder, startBlock };

for (const [key, value] of Object.entries(discovered)) {
  const previous = String(before[key] ?? '').toLowerCase();
  const marker = previous === value ? ' ' : '~';
  console.log(`  ${marker} ${key.padEnd(28)} ${value}`);
}
console.log(`  ${config.ponder.startBlock === before.startBlock ? ' ' : '~'} ${'ponder.startBlock'.padEnd(28)} ${startBlock}`);
console.log(`\n  (slasher ${slasher}, not stored — only used to reach the proposer)`);
console.log(`  (stakingRegistryAddress left as ${config.contracts.stakingRegistryAddress})`);

writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`\n✓ Updated .environment/${network}/config.json`);
