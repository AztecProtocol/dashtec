import { ponder } from 'ponder:registry';
import { providerTakeRateUpdated } from 'ponder:schema';
import { logBlockHash } from '../../lib/block-hash';
import { config } from '../../config';
// [DISABLED] Sync replaced by materializer
// import { syncProviderTakeRateUpdated } from '../../sync/staking-registry';

/**
 * Handle ProviderTakeRateUpdated event from StakingRegistry contract
 */
ponder.on('StakingRegistry:ProviderTakeRateUpdated', async ({ event, context }) => {
  const { providerIdentifier, newTakeRate } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  await db.insert(providerTakeRateUpdated).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    provider_identifier: providerIdentifier.toString(),
    new_take_rate: Number(newTakeRate),
    block_number: event.block.number.toString(),
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex.toString(),
    rollup_address: config.ROLLUP_CONTRACT_ADDRESS as `0x${string}`,
  });

  // [DISABLED] Sync replaced by materializer
  // await syncProviderTakeRateUpdated({
  //   providerIdentifier: providerIdentifier.toString(),
  //   newTakeRate: Number(newTakeRate),
  //   blockNumber: event.block.number.toString(),
  //   transactionHash: event.transaction.hash,
  //   logIndex: event.log.logIndex.toString(),
  //   timestamp: event.block.timestamp,
  // });
});
