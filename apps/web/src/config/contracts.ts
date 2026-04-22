import { Address } from 'viem';
import { getEnv } from './env';
import { RollupABI, TallySlashingProposerABI, ERC20ABI, StakingRegistryABI } from '@dashtec/shared-types';

/**
 * Contract configuration type
 */
export type ContractConfig<TAbi = any> = {
  address: Address;
  abi: TAbi;
};

/**
 * Get rollup contract configuration
 */
export function getRollupContractConfig(): ContractConfig<typeof RollupABI> {
  const env = getEnv();
  return {
    address: env.ROLLUP_CONTRACT_ADDRESS as Address,
    abi: RollupABI,
  };
}

/**
 * Get slashing proposer contract configuration
 */
export function getSlashingProposerContractConfig(): ContractConfig<typeof TallySlashingProposerABI> {
  const env = getEnv();
  return {
    address: env.SLASHING_PROPOSER_CONTRACT_ADDRESS as Address,
    abi: TallySlashingProposerABI,
  };
}

/**
 * Get ERC20 contract configuration
 */
export function getERC20ContractConfig(address: Address): ContractConfig<typeof ERC20ABI> {
  return {
    address,
    abi: ERC20ABI,
  };
}

/**
 * Get staking registry contract configuration
 */
export function getStakingRegistryContractConfig(): ContractConfig<typeof StakingRegistryABI> {
  const env = getEnv();
  return {
    address: env.STAKING_REGISTRY_CONTRACT_ADDRESS as Address,
    abi: StakingRegistryABI,
  };
}

/**
 * Get RPC URL from validated environment
 */
export function getRpcUrl(): string {
  const env = getEnv();
  return env.ETHEREUM_RPC_URL;
}

/**
 * Get chain name from validated environment
 */
export function getChainName(): 'mainnet' | 'sepolia' {
  const env = getEnv();
  return env.CHAIN_NAME;
}

// Export ABIs for direct use
export { RollupABI, TallySlashingProposerABI, ERC20ABI, StakingRegistryABI };
