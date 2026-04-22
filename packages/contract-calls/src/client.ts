import { createRpcClient, type CachedPublicClient, type RpcClientOptions } from '@dashtec/shared-utils';

export type ContractClient = CachedPublicClient;

export function createClient(options: RpcClientOptions): ContractClient {
  return createRpcClient(options);
}
