import type { Address } from 'viem';
import { type RpcClientOptions } from '@dashtec/shared-utils';
import { createClient } from './client';
import { createEmpireBase } from './contracts/empire-base';
import { createRollup } from './contracts/rollup';
import { createSlashing } from './contracts/slashing';
import { createStakingRegistry } from './contracts/staking-registry';
import { createERC20 } from './contracts/erc20';
import { createPayload } from './contracts/payload';

export * from './contracts/empire-base/types';
export * from './contracts/rollup/types';
export * from './contracts/slashing/types';
export * from './contracts/staking-registry/types';
export * from './contracts/erc20/types';
export * from './contracts/payload/types';

export interface ContractAddresses {
  governanceProposer: Address;
  slashingProposer: Address;
  rollup: Address;
  stakingRegistry: Address;
}

export interface ContractCallsConfig {
  rpcOptions: RpcClientOptions;
  addresses: ContractAddresses;
}

export function createContractCalls(config: ContractCallsConfig) {
  const { rpcOptions, addresses } = config;
  const client = createClient(rpcOptions);

  return {
    client,
    empireBase: createEmpireBase(client, addresses.governanceProposer, addresses.rollup),
    rollup: createRollup(client, addresses.rollup),
    slashing: createSlashing(client, addresses.slashingProposer),
    stakingRegistry: createStakingRegistry(client, addresses.stakingRegistry),
    /**
     * Create ERC20 contract methods for any token address
     */
    createERC20: (tokenAddress: Address) => createERC20(client, tokenAddress),
    /**
     * Create Payload contract methods for any payload address
     */
    createPayload: (payloadAddress: Address) => createPayload(client, payloadAddress),
  };
}
