import { ponder } from 'ponder:registry';
import { providerAdminUpdated } from 'ponder:schema';
import { logBlockHash } from '../../lib/block-hash';
import { config } from '../../config';
// [DISABLED] Sync replaced by materializer
// import { syncProviderAdminUpdated } from '../../sync/staking-registry';

/**
 * Handle ProviderAdminUpdated event from StakingRegistry contract
 */
ponder.on('StakingRegistry:ProviderAdminUpdated', async ({ event, context }) => {
  const { providerIdentifier, newAdmin } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  await db.insert(providerAdminUpdated).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    provider_identifier: providerIdentifier.toString(),
    new_admin: newAdmin,
    block_number: event.block.number.toString(),
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex.toString(),
    rollup_address: config.ROLLUP_CONTRACT_ADDRESS as `0x${string}`,
  });

  // [DISABLED] Sync replaced by materializer
  // await syncProviderAdminUpdated({
  //   providerIdentifier: providerIdentifier.toString(),
  //   newAdmin: newAdmin,
  //   blockNumber: event.block.number.toString(),
  //   transactionHash: event.transaction.hash,
  //   logIndex: event.log.logIndex.toString(),
  //   timestamp: event.block.timestamp,
  // });
});
