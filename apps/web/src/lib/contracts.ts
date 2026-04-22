import { createContractCalls } from '@dashtec/contract-calls';
import { getEnv } from '@/config';
import { resolveContractAddresses } from '@/services/rollupRegistry';
import type { Address } from 'viem';
import { logger } from '@dashtec/shared-utils';

const env = getEnv();

const rpcConfig = {
  urls: env.ETHEREUM_RPC_URL.split(',').map((url: string) => url.trim()),
  timeout: 10000,
  retryCount: 3,
  redisUrl: env.REDIS_URL,
};

const globalForContracts = globalThis as unknown as {
  contracts: ReturnType<typeof createContractCalls> | undefined;
};

function getContracts() {
  if (globalForContracts.contracts) {
    return globalForContracts.contracts;
  }

  const contracts = createContractCalls({
    rpcOptions: rpcConfig,
    addresses: {
      governanceProposer: env.GOVERNANCE_PROPOSER_CONTRACT_ADDRESS as Address,
      slashingProposer: env.SLASHING_PROPOSER_CONTRACT_ADDRESS as Address,
      rollup: env.ROLLUP_CONTRACT_ADDRESS as Address,
      stakingRegistry: env.STAKING_REGISTRY_CONTRACT_ADDRESS as Address,
    }
  });

  if (env.NODE_ENV !== 'production') {
    globalForContracts.contracts = contracts;
  }

  return contracts;
}

export const contracts = getContracts();

/** Create a contract-calls instance bound to a specific rollup address */
export function getContractsForRollup(rollupAddress: Address) {
  return createContractCalls({
    rpcOptions: rpcConfig,
    addresses: {
      governanceProposer: env.GOVERNANCE_PROPOSER_CONTRACT_ADDRESS as Address,
      slashingProposer: env.SLASHING_PROPOSER_CONTRACT_ADDRESS as Address,
      rollup: rollupAddress,
      stakingRegistry: env.STAKING_REGISTRY_CONTRACT_ADDRESS as Address,
    }
  });
}

const resolvedContractsCache = new Map<string, ReturnType<typeof createContractCalls>>();

/** Get contracts with fully resolved addresses for a specific rollup (cached) */
export async function getResolvedContracts(rollupAddress: string) {
  const key = rollupAddress.toLowerCase();
  if (key === env.ROLLUP_CONTRACT_ADDRESS.toLowerCase()) return contracts;
  if (resolvedContractsCache.has(key)) return resolvedContractsCache.get(key)!;

  const resolved = await resolveContractAddresses(rollupAddress);
  const instance = createContractCalls({
    rpcOptions: rpcConfig,
    addresses: {
      governanceProposer: resolved.governanceProposerAddress as Address,
      slashingProposer: resolved.slashingProposerAddress as Address,
      rollup: resolved.rollupAddress as Address,
      stakingRegistry: env.STAKING_REGISTRY_CONTRACT_ADDRESS as Address,
    }
  });

  resolvedContractsCache.set(key, instance);
  return instance;
}
