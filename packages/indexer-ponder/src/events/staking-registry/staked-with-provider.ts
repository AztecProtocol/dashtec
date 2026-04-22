import { ponder } from 'ponder:registry';
import { normalizeAddress } from '@dashtec/shared-utils';
import { stakedWithProvider } from 'ponder:schema';
import { logBlockHash } from '../../lib/block-hash';
// [DISABLED] Sync replaced by materializer
// import { syncStakedWithProvider } from '../../sync/staking-registry';

/**
 * Handle StakedWithProvider event from StakingRegistry contract
 * Records when a validator stakes with a provider
 */
ponder.on('StakingRegistry:StakedWithProvider', async ({ event, context }) => {
  const { providerIdentifier, rollupAddress, attester, coinbaseSplitContractAddress, stakerAddress } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  const normalizedAttester = normalizeAddress(attester);
  const normalizedRollup = normalizeAddress(rollupAddress);
  const normalizedCoinbaseSplit = normalizeAddress(coinbaseSplitContractAddress);
  const normalizedStaker = normalizeAddress(stakerAddress);

  await db.insert(stakedWithProvider).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    provider_identifier: providerIdentifier.toString(),
    rollup_address: normalizedRollup,
    attester_address: normalizedAttester,
    coinbase_split_contract_address: normalizedCoinbaseSplit,
    staker_address: normalizedStaker,
    block_number: event.block.number.toString(),
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex.toString(),
    timestamp: event.block.timestamp,
  });

  // [DISABLED] Sync replaced by materializer
  // await syncStakedWithProvider({
  //   providerIdentifier: providerIdentifier.toString(),
  //   rollupAddress: normalizedRollup,
  //   attesterAddress: normalizedAttester,
  //   coinbaseSplitContractAddress: normalizedCoinbaseSplit,
  //   stakerAddress: normalizedStaker,
  //   blockNumber: event.block.number.toString(),
  //   transactionHash: event.transaction.hash,
  //   logIndex: event.log.logIndex.toString(),
  //   timestamp: event.block.timestamp,
  // });
});
