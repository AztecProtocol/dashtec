# @dashtec/aztec-rpc-sdk

TypeScript SDK for Aztec Node JSON-RPC API.

## Installation

```bash
pnpm add @dashtec/aztec-rpc-sdk
# or install from GitHub
pnpm add github:DashNode-Org/aztec-rpc-sdk
```

## Usage

```typescript
import { createAztecRpcClient, createAztecMethods } from '@dashtec/aztec-rpc-sdk';

const client = createAztecRpcClient({ 
  url: 'http://localhost:8080',
  timeout: 30000,
  retries: 3,
});

const aztec = createAztecMethods(client);

// Node info
const info = await aztec.getNodeInfo();
console.log(info.nodeVersion, info.l1ChainId);

// Block queries
const blockNumber = await aztec.getBlockNumber();
const block = await aztec.getBlock(blockNumber);
const tips = await aztec.getL2Tips();

// Validator stats
const stats = await aztec.getValidatorsStats();
const validatorStats = await aztec.getValidatorStats('0x...');

// Logs (use filter object)
const logs = await aztec.getPrivateLogs({
  fromBlock: 16190,
  toBlock: 16195,
  afterLog: null,
});
```

## Available Methods

### Node Information
- `isReady()` - Check if node is ready
- `getNodeInfo()` - Get node info (version, chainId, contracts)
- `getNodeVersion()` - Get node version string
- `getVersion()` - Get protocol version
- `getChainId()` - Get L1 chain ID
- `getL1ContractAddresses()` - Get L1 contract addresses
- `getProtocolContractAddresses()` - Get protocol contract addresses
- `getEncodedEnr()` - Get ENR
- `getCurrentBaseFees()` - Get current gas fees

### Block Queries
- `getBlockNumber()` - Get latest block number
- `getProvenBlockNumber()` - Get proven block number
- `getL2Tips()` - Get L2 tips (latest, proven, finalized)
- `getBlock(blockNumber)` - Get block by number
- `getBlocks(from, limit)` - Get blocks by range
- `getBlockHeader(blockNumber)` - Get block header

### World State
- `getWorldStateSyncStatus()` - Get sync status
- `getPublicStorageAt(address, slot)` - Get public storage

### Validators
- `getValidatorsStats()` - Get all validators stats
- `getValidatorStats(address)` - Get single validator stats

### Transactions
- `getTxReceipt(txHash)` - Get transaction receipt
- `getTxEffect(txHash)` - Get transaction effect
- `getTxByHash(txHash)` - Get transaction by hash
- `getPendingTxs()` - Get pending transactions
- `getPendingTxCount()` - Get pending tx count

### Contracts
- `getContractClass(classId)` - Get contract class
- `getContract(address)` - Get contract instance

### Logs
- `getPrivateLogs(filter)` - Get private logs
- `getPublicLogs(filter)` - Get public logs
- `getContractClassLogs(filter)` - Get contract class logs

## TODO

- [ ] Add missing methods from API reference:
  - [ ] `node_sendTx`
  - [ ] `node_isValidTx`
  - [ ] `node_simulatePublicCalls`
  - [ ] `node_findLeavesIndexes`
  - [ ] `node_getNullifierSiblingPath`
  - [ ] `node_getNoteHashSiblingPath`
  - [ ] `node_getArchiveSiblingPath`
  - [ ] `node_getPublicDataSiblingPath`
  - [ ] `node_getNullifierMembershipWitness`
  - [ ] `node_getLowNullifierMembershipWitness`
  - [ ] `node_getPublicDataWitness`
  - [ ] `node_getArchiveMembershipWitness`
  - [ ] `node_getNoteHashMembershipWitness`
  - [ ] `node_getL1ToL2MessageMembershipWitness`
  - [ ] `node_getL1ToL2MessageBlock`
  - [ ] `node_isL1ToL2MessageSynced`
  - [ ] `node_getL2ToL1Messages`
  - [ ] `node_getLogsByTags`
  - [ ] `node_registerContractFunctionSignatures`
  - [ ] `node_getAllowedPublicSetup`
  - [ ] `nodeAdmin_*` methods
- [ ] Add proper types for remaining `unknown` return types
- [ ] Verify `getPublicStorageAt` parameter format
- [ ] Add unit tests
- [ ] Add integration tests against testnet
- [ ] Publish to npm

## Development

```bash
# Build
pnpm build

# Type check
pnpm typecheck

# Sync to dedicated repo
pnpm sdk:push  # from monorepo root
```

## License

MIT
