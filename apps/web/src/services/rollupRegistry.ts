import prisma from '@/lib/prisma';
import { getEnv } from '@/config/env';
import { getContractsForRollup } from '@/lib/contracts';
import { SlasherABI, GseViewABI, GovernanceABI } from '@dashtec/shared-types';
import type { RollupRegistry, RollupDerivedAddresses } from '@/types/rollup';
import type { Address } from 'viem';

let cachedRegistry: RollupRegistry | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 minute
const IMMUTABLE_CACHE_MS = 86_400_000; // 24 hours — contract addresses are immutable per rollup

/** Load rollup registry from CanonicalRollupUpdated table, with env fallback */
export async function getRollupRegistry(): Promise<RollupRegistry> {
  const now = Date.now();
  if (cachedRegistry && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedRegistry;
  }

  const rows = await prisma.canonicalRollupUpdated.findMany();

  if (rows.length > 0) {
    // Sort numerically — block_number is BigInt and log_index is Int from Prisma
    const sorted = rows.sort((a, b) => {
      const blockDiff = Number(a.block_number) - Number(b.block_number);
      return blockDiff !== 0 ? blockDiff : Number(a.log_index) - Number(b.log_index);
    });

    const versions = sorted.map((row) => ({
      address: row.instance_address.toLowerCase(),
      label: `v${row.version}`,
      startBlock: Number(row.block_number),
      endBlock: null as number | null,
      deprecated: false,
    }));

    const active = versions[versions.length - 1];

    for (let i = 0; i < versions.length - 1; i++) {
      versions[i].deprecated = true;
      versions[i].endBlock = versions[i + 1].startBlock;
    }

    cachedRegistry = { versions, activeAddress: active.address };
  } else {
    const env = getEnv();
    cachedRegistry = {
      versions: [{
        address: env.ROLLUP_CONTRACT_ADDRESS.toLowerCase(),
        label: 'v1',
        startBlock: 0,
        endBlock: null,
        deprecated: false,
      }],
      activeAddress: env.ROLLUP_CONTRACT_ADDRESS.toLowerCase(),
    };
  }

  cacheTimestamp = now;
  return cachedRegistry;
}

/** Get the active rollup address (latest non-deprecated) */
export async function getActiveRollupAddress(): Promise<string> {
  return (await getRollupRegistry()).activeAddress;
}

/** Check if an address is a known rollup version */
export async function isValidRollupAddress(address: string): Promise<boolean> {
  const registry = await getRollupRegistry();
  return registry.versions.some(v => v.address.toLowerCase() === address.toLowerCase());
}

/**
 * Derive related contract addresses from a rollup address via on-chain calls.
 * Slashing Proposer: Rollup → getSlasher() → Slasher.PROPOSER()
 * Governance Proposer: Rollup → getGSE() → GSE.getGovernance() → Governance.governanceProposer()
 * All calls use readContractWithCache (24h TTL) — addresses are immutable per rollup.
 */
export async function resolveContractAddresses(rollupAddress?: string): Promise<RollupDerivedAddresses> {
  const address = (rollupAddress || await getActiveRollupAddress()).toLowerCase() as Address;
  const { client, rollup } = getContractsForRollup(address);

  // Rollup → getSlasher() → Slasher.PROPOSER()
  const slasherAddress = await rollup.getSlasher();
  const slashingProposer = await client.readContractWithCache<Address>(
    { address: slasherAddress, abi: SlasherABI, functionName: 'PROPOSER' },
    { cacheKey: `derive:slashingProposer:${address}`, cacheDuration: IMMUTABLE_CACHE_MS },
  );

  // Rollup → getGSE() → GSE.getGovernance() → Governance.governanceProposer()
  const gseAddress = await rollup.getGSE();
  const governanceAddress = await client.readContractWithCache<Address>(
    { address: gseAddress, abi: GseViewABI, functionName: 'getGovernance' },
    { cacheKey: `derive:governance:${address}`, cacheDuration: IMMUTABLE_CACHE_MS },
  );
  const governanceProposer = await client.readContractWithCache<Address>(
    { address: governanceAddress, abi: GovernanceABI, functionName: 'governanceProposer' },
    { cacheKey: `derive:govProposer:${address}`, cacheDuration: IMMUTABLE_CACHE_MS },
  );

  return {
    rollupAddress: address,
    slasherAddress: slasherAddress.toLowerCase(),
    slashingProposerAddress: slashingProposer.toLowerCase(),
    governanceProposerAddress: governanceProposer.toLowerCase(),
  };
}
